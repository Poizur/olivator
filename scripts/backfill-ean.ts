/**
 * Re-scrape EAN pro produkty které ho nemají, s opraveným extractorem
 * (microdata + Shoptet productEan__value + tolerantní regex).
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-ean.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeProductPage } from '@/lib/product-scraper'

const CONCURRENCY = 4

interface ProductRow {
  id: string
  slug: string
  name: string
  source_url: string | null
  ean: string | null
}

async function main() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, source_url, ean')
    .eq('status', 'active')
    .is('ean', null)
    .returns<ProductRow[]>()
  if (error || !products) {
    console.error(error)
    process.exit(1)
  }
  console.log(`[ean] ${products.length} produktů bez EAN`)

  let found = 0
  let notFound = 0
  let failed = 0
  const queue = [...products]
  const worker = async () => {
    while (queue.length > 0) {
      const p = queue.shift()
      if (!p) return
      if (!p.source_url) { notFound++; continue }
      try {
        const scraped = await scrapeProductPage(p.source_url)
        if (scraped.ean) {
          // Check uniqueness — if EAN already in another row, skip to avoid UNIQUE violation
          const { data: existing } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('ean', scraped.ean)
            .neq('id', p.id)
            .maybeSingle()
          if (existing) {
            console.warn(`  ⚠ ${p.slug.slice(0, 50)} EAN ${scraped.ean} už existuje na jiném produktu`)
            notFound++
            continue
          }
          const { error: updErr } = await supabaseAdmin
            .from('products')
            .update({ ean: scraped.ean, updated_at: new Date().toISOString() })
            .eq('id', p.id)
          if (updErr) {
            failed++
            console.warn(`  ✗ ${p.slug.slice(0, 50)} | ${updErr.message}`)
          } else {
            found++
            console.log(`  ✓ ${p.slug.slice(0, 50)} → ${scraped.ean}`)
          }
        } else {
          notFound++
        }
      } catch (err) {
        failed++
        console.warn(`  ✗ ${p.slug.slice(0, 50)} | ${err instanceof Error ? err.message : err}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log('')
  console.log(`[ean] done — found=${found} not_found=${notFound} failed=${failed}`)
  process.exit(0)
}

main().catch((err) => { console.error('[ean] fatal:', err); process.exit(1) })
