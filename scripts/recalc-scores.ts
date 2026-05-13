/**
 * Recalculates Olivator Score for all active products using the current formula.
 * Picks up the new functional bonus (2026-05-13): +1 per 200 mg/kg above 1500 mg/kg, max +10.
 *
 * Run: npx tsx scripts/recalc-scores.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { calculateScore } from '@/lib/score'

interface ProductRow {
  id: string
  name: string
  slug: string
  acidity: number | null
  certifications: string[] | null
  polyphenols: number | null
  peroxide_value: number | null
  volume_ml: number | null
  type: string | null
  olivator_score: number | null
}

interface OfferRow {
  product_id: string
  price: number | null
}

async function getCheapestPricePer100ml(productId: string, volumeMl: number | null): Promise<number | null> {
  if (!volumeMl || volumeMl <= 0) return null
  const { data } = await supabaseAdmin
    .from('product_offers')
    .select('price')
    .eq('product_id', productId)
    .eq('in_stock', true)
    .order('price', { ascending: true })
    .limit(1)
    .returns<OfferRow[]>()
  const cheapest = data?.[0]?.price
  if (cheapest == null) return null
  return Number(((cheapest / volumeMl) * 100).toFixed(2))
}

async function main() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, acidity, certifications, polyphenols, peroxide_value, volume_ml, type, olivator_score')
    .eq('status', 'active')
    .returns<ProductRow[]>()

  if (error) {
    console.error('[recalc] DB query failed:', error)
    process.exit(1)
  }
  if (!products || products.length === 0) {
    console.log('[recalc] no active products found')
    return
  }

  console.log(`[recalc] processing ${products.length} active products`)

  let updated = 0
  let unchanged = 0
  let noData = 0
  let withBonus = 0

  for (const p of products) {
    const pricePer100ml = await getCheapestPricePer100ml(p.id, p.volume_ml)
    const score = calculateScore({
      acidity: p.acidity,
      certifications: p.certifications,
      polyphenols: p.polyphenols,
      peroxideValue: p.peroxide_value,
      pricePer100ml,
      type: p.type,
    })

    const newScore = score.insufficientData ? null : score.total

    if (newScore === p.olivator_score && !score.breakdown.functionalBonus) {
      unchanged++
      continue
    }

    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update({
        olivator_score: newScore,
        score_breakdown: score.breakdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)

    if (updateErr) {
      console.warn(`[recalc] UPDATE failed for ${p.slug}:`, updateErr.message)
      continue
    }

    const bonus = score.breakdown.functionalBonus ?? 0
    if (bonus > 0) withBonus++
    if (newScore == null) noData++

    const change = newScore != null && p.olivator_score != null
      ? `${p.olivator_score} → ${newScore}` + (bonus > 0 ? ` (base ${score.baseScore} +${bonus} bonus)` : '')
      : `→ ${newScore ?? 'null'}`
    updated++
    console.log(`  ✓ ${p.name.slice(0, 55).padEnd(55)} ${change}`)
  }

  console.log('')
  console.log(`[recalc] done — updated=${updated} unchanged=${unchanged} withBonus=${withBonus} noData=${noData}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[recalc] fatal:', err)
  process.exit(1)
})
