/**
 * One-shot backfill: extract polyphenols from existing description text
 * for products where the structured field is NULL. Uses the (fixed) regex
 * from lib/product-scraper. Recomputes Olivator Score for each updated row.
 *
 * Run: npx tsx scripts/backfill-polyphenols.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { extractPolyphenols } from '@/lib/product-scraper'
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
  description_short: string | null
  description_long: string | null
}

interface OfferRow {
  product_id: string
  price: number | null
}

async function getCheapestPricePer100ml(
  productId: string,
  volumeMl: number | null
): Promise<number | null> {
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
    .select(
      'id, name, slug, acidity, certifications, polyphenols, peroxide_value, volume_ml, description_short, description_long'
    )
    .eq('status', 'active')
    .is('polyphenols', null)
    .returns<ProductRow[]>()

  if (error) {
    console.error('[backfill] DB query failed:', error)
    process.exit(1)
  }
  if (!products) {
    console.log('[backfill] no products to process')
    return
  }

  console.log(`[backfill] checking ${products.length} active products with polyphenols=NULL`)

  let extracted = 0
  let skipped = 0
  let scoreChanged = 0

  for (const p of products) {
    // Some products mention polyphenol numbers in the name itself (e.g. "CORINTO 600+ polyfenolů")
    const text = `${p.name}\n${p.description_short ?? ''}\n${p.description_long ?? ''}`.trim()
    const value = extractPolyphenols(text)
    if (value == null) {
      skipped++
      continue
    }

    const pricePer100ml = await getCheapestPricePer100ml(p.id, p.volume_ml)
    const score = calculateScore({
      acidity: p.acidity,
      certifications: p.certifications,
      polyphenols: value,
      peroxideValue: p.peroxide_value,
      pricePer100ml,
    })

    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update({
        polyphenols: value,
        olivator_score: score.total,
        score_breakdown: score.breakdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)

    if (updateErr) {
      console.warn(`[backfill] UPDATE failed for ${p.slug}:`, updateErr.message)
      continue
    }

    extracted++
    scoreChanged++
    console.log(
      `  ✓ ${p.name.slice(0, 60)} → polyphenols=${value} score=${score.total} (acidity=${score.breakdown.acidity} certs=${score.breakdown.certifications} quality=${score.breakdown.quality} value=${score.breakdown.value})`
    )
  }

  console.log('')
  console.log(`[backfill] done — extracted=${extracted} score_updated=${scoreChanged} skipped=${skipped}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[backfill] fatal:', err)
  process.exit(1)
})
