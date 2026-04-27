/**
 * Thorough re-scrape přes všechny aktivní produkty s opraveným scraperem,
 * který extrahuje:
 *  - EAN přes microdata + Shoptet productEan
 *  - K232, K270, DK, vosk z parameter tabulky → score_breakdown
 *  - Oleic acid → oleic_acid_pct (existing column)
 *  - Acidity z tabulky jako fallback
 *  - Peroxide ve formátu "≤ 20 mEq" → peroxide_value
 *  - Celá parameter table → extracted_facts (admin uvidí všechno)
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-thorough.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeProductPage } from '@/lib/product-scraper'
import { applyRescrapePatch } from '@/lib/data'

const CONCURRENCY = 3

interface ProductRow {
  id: string
  slug: string
  source_url: string | null
}

async function main() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, slug, source_url')
    .eq('status', 'active')
    .returns<ProductRow[]>()
  if (error || !products) {
    console.error(error); process.exit(1)
  }
  console.log(`[thorough] re-scraping ${products.length} aktivních produktů`)

  let ok = 0
  let failed = 0
  let noSource = 0
  const queue = [...products]
  const allFilled = new Map<string, number>()

  const worker = async () => {
    while (queue.length > 0) {
      const p = queue.shift()
      if (!p) return
      if (!p.source_url) { noSource++; continue }
      try {
        const scraped = await scrapeProductPage(p.source_url)
        const { filled } = await applyRescrapePatch(p.id, {
          sourceUrl: p.source_url,
          rawDescription: scraped.rawDescription,
          ean: scraped.ean,
          acidity: scraped.acidity,
          polyphenols: scraped.polyphenols,
          peroxideValue: scraped.peroxideValue,
          oleicAcidPct: scraped.oleicAcidPct,
          volumeMl: scraped.volumeMl,
          packaging: scraped.packaging,
          k232: scraped.k232,
          k270: scraped.k270,
          deltaK: scraped.deltaK,
          waxMaxMgPerKg: scraped.waxMaxMgPerKg,
          parameterTable: scraped.parameterTable,
        })
        ok++
        if (filled.length > 0) {
          for (const f of filled) {
            const key = f.split(' ')[0]
            allFilled.set(key, (allFilled.get(key) ?? 0) + 1)
          }
          console.log(`  ✓ ${p.slug.slice(0, 50).padEnd(50)} ${filled.join(', ')}`)
        } else {
          console.log(`  · ${p.slug.slice(0, 50).padEnd(50)} (žádné nové)`)
        }
      } catch (err) {
        failed++
        console.warn(`  ✗ ${p.slug.slice(0, 50).padEnd(50)} ${err instanceof Error ? err.message : err}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log('')
  console.log(`[thorough] done — ok=${ok} failed=${failed} no_source=${noSource}`)
  console.log('Doplněná pole napříč katalogem:')
  for (const [field, count] of [...allFilled.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${field}: ${count} produktů`)
  }
  process.exit(0)
}

main().catch((err) => { console.error('[thorough] fatal:', err); process.exit(1) })
