// One-shot backfill po zavedení 'flavored' typu + cert auto-detection.
//
// 1) Re-detect type: aromatizované oleje (s lanýžem, bazalkou, česnekem...)
//    překlasifikujeme z 'evoo' na 'flavored'. UI pak zobrazí "Aroma" badge
//    místo Olivator Score 10/100 (užitečnější informace).
//
// 2) Re-detect certifikace: Bartolini IGP/Toscano DOP/Biologico produkty mají
//    detekovatelné certifikace v názvu, ale starý feed-sync.ts je neukládal.
//    Run cert-detector na name+raw_description.
//
// 3) Recompute Olivator Score: po krocích 1+2 se score změní u většiny
//    aromatizovaných (→ null) i nově certifikovaných produktů.
//
// Spuštění: npx tsx scripts/backfill-flavored-and-certs.ts
//   nebo:    npx tsx scripts/backfill-flavored-and-certs.ts --dry-run
//
// PŘEDPOKLAD: Migration 20260507_flavored_oil_type.sql musí být aplikovaná
// před spuštěním (jinak ALTER TABLE constraint odmítne 'flavored' value).

import { supabaseAdmin } from '@/lib/supabase'
import { isFlavoredOilName } from '@/lib/heureka-feed-parser'
import { detectCertificationsInText } from '@/lib/cert-detector'
import { calculateScore } from '@/lib/score'

const DRY_RUN = process.argv.includes('--dry-run')

interface ProductRow {
  id: string
  name: string
  slug: string
  type: string | null
  acidity: number | null
  polyphenols: number | null
  peroxide_value: number | null
  certifications: string[] | null
  raw_description: string | null
  volume_ml: number | null
  olivator_score: number | null
}

async function getCheapestPricePer100ml(productId: string, volumeMl: number | null): Promise<number | null> {
  if (!volumeMl || volumeMl <= 0) return null
  const { data } = await supabaseAdmin
    .from('product_offers')
    .select('price')
    .eq('product_id', productId)
    .order('price', { ascending: true })
    .limit(1)
  const cheapest = data?.[0]?.price ? Number(data[0].price) : null
  return cheapest ? (cheapest / volumeMl) * 100 : null
}

async function main() {
  console.log(DRY_RUN ? '🧪 DRY RUN — žádné změny v DB' : '✏️  LIVE — zápis do DB povolen')

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(
      'id, name, slug, type, acidity, polyphenols, peroxide_value, certifications, raw_description, volume_ml, olivator_score'
    )
    .eq('status', 'active')
    .returns<ProductRow[]>()

  if (error) {
    console.error('[backfill] DB query failed:', error)
    process.exit(1)
  }
  if (!products) {
    console.log('[backfill] no products')
    return
  }

  console.log(`[backfill] zpracovávám ${products.length} aktivních produktů`)

  let typeChanged = 0
  let certsAdded = 0
  let scoreUpdated = 0
  let scoreCleared = 0

  for (const p of products) {
    const patches: Record<string, unknown> = {}

    // 1) Re-detect type pro aromatizované
    const isFlavored = isFlavoredOilName(p.name.toLowerCase())
    if (isFlavored && p.type !== 'flavored') {
      patches.type = 'flavored'
      typeChanged++
      console.log(`  [TYPE] ${p.name.slice(0, 60)} — ${p.type} → flavored`)
    }

    // 2) Re-detect certifikace (jen pokud nejsou žádné — netrumfovat manuální editaci)
    const currentCerts = p.certifications ?? []
    if (currentCerts.length === 0) {
      const text = `${p.name}\n${p.raw_description ?? ''}`
      const candidates = detectCertificationsInText(text)
      const newCerts = candidates.filter(c => c.confidence === 'high').map(c => c.cert)
      if (newCerts.length > 0) {
        patches.certifications = newCerts
        certsAdded++
        console.log(`  [CERT] ${p.name.slice(0, 60)} — + ${newCerts.join(', ')}`)
      }
    }

    // 3) Recompute Olivator Score (po type/cert změnách + s novou logikou)
    const finalType = (patches.type as string | undefined) ?? p.type
    const finalCerts = (patches.certifications as string[] | undefined) ?? currentCerts
    const pricePer100ml = await getCheapestPricePer100ml(p.id, p.volume_ml)
    const score = calculateScore({
      acidity: p.acidity,
      certifications: finalCerts,
      polyphenols: p.polyphenols,
      peroxideValue: p.peroxide_value,
      pricePer100ml,
      type: finalType,
    })
    const newScoreValue = score.insufficientData ? null : score.total

    if (p.olivator_score !== newScoreValue) {
      patches.olivator_score = newScoreValue
      patches.score_breakdown = score.breakdown
      if (newScoreValue == null) {
        scoreCleared++
        console.log(`  [SCORE] ${p.name.slice(0, 60)} — ${p.olivator_score} → null (${finalType === 'flavored' ? 'flavored' : 'insufficient data'})`)
      } else {
        scoreUpdated++
        console.log(`  [SCORE] ${p.name.slice(0, 60)} — ${p.olivator_score} → ${newScoreValue}`)
      }
    }

    if (!DRY_RUN && Object.keys(patches).length > 0) {
      const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update({ ...patches, updated_at: new Date().toISOString() })
        .eq('id', p.id)
      if (updateErr) {
        console.warn(`  ⚠️  UPDATE failed for ${p.slug}:`, updateErr.message)
      }
    }
  }

  console.log()
  console.log('═══ Souhrn ═══')
  console.log(`Type změněn na 'flavored': ${typeChanged}`)
  console.log(`Certifikace přidány:        ${certsAdded}`)
  console.log(`Score recomputed:           ${scoreUpdated}`)
  console.log(`Score vynulován (null):     ${scoreCleared}`)
  if (DRY_RUN) console.log('\n(DRY RUN — nic se neuložilo. Spusť bez --dry-run pro skutečný backfill.)')
}

main().catch(err => {
  console.error('[backfill] FATAL:', err)
  process.exit(1)
})
