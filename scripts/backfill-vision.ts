/**
 * AI vision pass přes existující galerii:
 *  1. Pro každou published fotku (source='scraper') vygeneruje vision-based
 *     alt text přes Haiku.
 *  2. Pro každý produkt s NULL chemistry najde lab-looking fotku a auto-scanuje
 *     přes scanLabReport (Sonnet vision), doplní chybějící hodnoty.
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-vision.ts
 *
 * Cost odhad: ~$1.10 alt + ~$0.60 lab pro současný katalog (~$2 total).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { generateImageAltText } from '@/lib/product-image'
import { scanLabReport, looksLikeLabReport } from '@/lib/lab-report-agent'
import { calculateScore } from '@/lib/score'

const ALT_CONCURRENCY = 3
const LAB_CONCURRENCY = 2

interface ImgRow {
  id: string
  product_id: string
  url: string
  alt_text: string | null
  is_primary: boolean
  sort_order: number
  source: string
}

interface ProductRow {
  id: string
  name: string
  slug: string
  acidity: number | null
  polyphenols: number | null
  peroxide_value: number | null
  oleic_acid_pct: number | null
  certifications: string[] | null
  volume_ml: number | null
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
  const cheapest = data?.[0]?.price
  if (cheapest == null) return null
  return Number(((Number(cheapest) / volumeMl) * 100).toFixed(2))
}

async function step1_alt() {
  console.log('\n[1/2] Vision alt text pro published fotky')
  const { data: imgs, error } = await supabaseAdmin
    .from('product_images')
    .select('id, product_id, url, alt_text, is_primary, sort_order, source')
    .eq('source', 'scraper')
    .returns<ImgRow[]>()
  if (error || !imgs) { console.error(error); return }

  const productIds = [...new Set(imgs.map((i) => i.product_id))]
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .in('id', productIds)
  const nameMap = new Map<string, string>()
  for (const p of products ?? []) nameMap.set(p.id as string, p.name as string)

  console.log(`  ${imgs.length} fotek pro ${productIds.length} produktů`)
  let ok = 0
  let failed = 0
  const queue = [...imgs]
  const worker = async () => {
    while (queue.length > 0) {
      const img = queue.shift()
      if (!img) return
      const name = nameMap.get(img.product_id)
      if (!name) { failed++; continue }
      try {
        const alt = await generateImageAltText(img.url, name)
        await supabaseAdmin
          .from('product_images')
          .update({ alt_text: alt })
          .eq('id', img.id)
        ok++
        if (ok % 20 === 0) console.log(`    ... ${ok}/${imgs.length}`)
      } catch (err) {
        failed++
        console.warn(`    ✗ ${img.id} ${err instanceof Error ? err.message : err}`)
      }
    }
  }
  await Promise.all(Array.from({ length: ALT_CONCURRENCY }, () => worker()))
  console.log(`  done — ok=${ok} failed=${failed}`)
}

async function step2_lab() {
  console.log('\n[2/2] Auto-scan lab reports pro produkty s chybějící chemií')
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, acidity, polyphenols, peroxide_value, oleic_acid_pct, certifications, volume_ml')
    .eq('status', 'active')
    .returns<ProductRow[]>()
  if (error || !products) { console.error(error); return }

  // Filter: produkty s aspoň jedním NULL chemistry polem
  const needScan = products.filter(
    (p) => p.acidity == null || p.polyphenols == null || p.peroxide_value == null || p.oleic_acid_pct == null
  )
  console.log(`  ${needScan.length}/${products.length} produktů má NULL chemii`)

  // Pro každý takový produkt najdi lab-looking fotku
  let ok = 0
  let scanned = 0
  let noLabPhoto = 0
  const queue = [...needScan]
  const worker = async () => {
    while (queue.length > 0) {
      const p = queue.shift()
      if (!p) return
      const { data: imgs } = await supabaseAdmin
        .from('product_images')
        .select('url, alt_text')
        .eq('product_id', p.id)
        .neq('source', 'scraper_candidate') // only published
      const labPhoto = (imgs ?? []).find((img) => looksLikeLabReport(img.url as string, img.alt_text as string | null))
      if (!labPhoto) { noLabPhoto++; continue }
      try {
        const lab = await scanLabReport(labPhoto.url as string)
        scanned++
        if (lab.confidence === 'low') continue
        const patch: Record<string, number> = {}
        if (p.acidity == null && lab.acidity != null) patch.acidity = lab.acidity
        if (p.polyphenols == null && lab.polyphenols != null) patch.polyphenols = lab.polyphenols
        if (p.peroxide_value == null && lab.peroxideValue != null) patch.peroxide_value = lab.peroxideValue
        if (p.oleic_acid_pct == null && lab.oleicAcidPct != null) patch.oleic_acid_pct = lab.oleicAcidPct
        if (Object.keys(patch).length === 0) continue

        // Recalculate score after chemistry update
        const merged = { ...p, ...patch }
        const pricePer100ml = await getCheapestPricePer100ml(p.id, p.volume_ml)
        const score = calculateScore({
          acidity: merged.acidity,
          certifications: merged.certifications,
          polyphenols: merged.polyphenols,
          peroxideValue: merged.peroxide_value,
          pricePer100ml,
        })

        await supabaseAdmin
          .from('products')
          .update({
            ...patch,
            olivator_score: score.total,
            score_breakdown: score.breakdown,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id)
        ok++
        console.log(`    ✓ ${p.slug.slice(0, 50)} → ${Object.keys(patch).join(',')} (score=${score.total})`)
      } catch (err) {
        console.warn(`    ✗ ${p.slug.slice(0, 50)} ${err instanceof Error ? err.message : err}`)
      }
    }
  }
  await Promise.all(Array.from({ length: LAB_CONCURRENCY }, () => worker()))
  console.log(`  done — scanned=${scanned} updated=${ok} no_lab_photo=${noLabPhoto}`)
}

async function main() {
  await step1_alt()
  await step2_lab()
  console.log('\n[backfill-vision] all done')
  process.exit(0)
}

main().catch((err) => { console.error('[backfill-vision] fatal:', err); process.exit(1) })
