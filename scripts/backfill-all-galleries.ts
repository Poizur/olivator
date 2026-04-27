/**
 * Bulk gallery backfill: pro každý aktivní produkt s 0 řádky v product_images
 * scrape jeho source_url a uloží prvních 5 obrázků jako source='scraper',
 * zbytek jako source='scraper_candidate'. První dostane is_primary.
 *
 * Best-effort: jeden selhaný produkt nezastaví celý běh.
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-all-galleries.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeProductPage } from '@/lib/product-scraper'

const PUBLISH_COUNT = 5
const CONCURRENCY = 3 // parallel scrapes — be polite

interface ProductRow {
  id: string
  name: string
  slug: string
  source_url: string | null
  image_url: string | null
}

async function processProduct(p: ProductRow): Promise<{ ok: boolean; published: number; candidates: number; error?: string }> {
  if (!p.source_url) return { ok: false, published: 0, candidates: 0, error: 'no source_url' }

  // Skip if any rows already exist for this product
  const { data: existing } = await supabaseAdmin
    .from('product_images')
    .select('id')
    .eq('product_id', p.id)
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, published: 0, candidates: 0, error: 'already has rows' }
  }

  const scraped = await scrapeProductPage(p.source_url)
  if (scraped.galleryImages.length === 0) {
    return { ok: true, published: 0, candidates: 0, error: 'scrape returned no images' }
  }

  const toPublish = scraped.galleryImages.slice(0, PUBLISH_COUNT)
  const toCandidate = scraped.galleryImages.slice(PUBLISH_COUNT)
  const productHasPrimary = !!p.image_url

  const rows = [
    ...toPublish.map((img, i) => ({
      product_id: p.id,
      url: img.url,
      alt_text: img.alt,
      // Set is_primary on the first row only if products.image_url isn't already set
      // (otherwise we'd have two "primary" sources of truth).
      is_primary: !productHasPrimary && i === 0,
      sort_order: i,
      source: 'scraper',
    })),
    ...toCandidate.map((img, i) => ({
      product_id: p.id,
      url: img.url,
      alt_text: img.alt,
      is_primary: false,
      sort_order: 100 + i,
      source: 'scraper_candidate',
    })),
  ]
  const { error } = await supabaseAdmin.from('product_images').insert(rows)
  if (error) return { ok: false, published: 0, candidates: 0, error: error.message }
  return { ok: true, published: toPublish.length, candidates: toCandidate.length }
}

async function main() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, source_url, image_url')
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

  console.log(`[backfill] processing ${products.length} active products (concurrency=${CONCURRENCY})`)

  let totalPublished = 0
  let totalCandidates = 0
  let processed = 0
  let skipped = 0
  let failed = 0

  // Simple worker pool
  const queue = [...products]
  const worker = async () => {
    while (queue.length > 0) {
      const p = queue.shift()
      if (!p) return
      try {
        const result = await processProduct(p)
        if (result.published > 0 || result.candidates > 0) {
          totalPublished += result.published
          totalCandidates += result.candidates
          processed++
          console.log(`  ✓ ${p.slug.slice(0, 50).padEnd(50)} +${result.published} pub +${result.candidates} cand`)
        } else if (result.error === 'already has rows') {
          skipped++
        } else {
          failed++
          console.warn(`  ✗ ${p.slug.slice(0, 50).padEnd(50)} ${result.error}`)
        }
      } catch (err) {
        failed++
        console.warn(`  ✗ ${p.slug.slice(0, 50).padEnd(50)} ${err instanceof Error ? err.message : err}`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log('')
  console.log(`[backfill] done — processed=${processed} skipped=${skipped} failed=${failed}`)
  console.log(`  total: ${totalPublished} published, ${totalCandidates} candidates`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[backfill] fatal:', err)
  process.exit(1)
})
