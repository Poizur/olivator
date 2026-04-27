/**
 * Stáhne publikované gallery photos (source='scraper') ze zdrojových e-shop
 * CDN do našeho Supabase Storage. Updatuje URL v product_images.
 *
 * Necháváme:
 *  - source='scraper_candidate' (drafty) zůstávají hotlinky → šetří storage
 *  - source='manual' / 'discovery_agent' bez změny pokud už hostujeme
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-gallery-storage.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { downloadAndStoreImage } from '@/lib/product-image'

const CONCURRENCY = 3

interface ImgRow {
  id: string
  product_id: string
  url: string
  sort_order: number
  is_primary: boolean
}

interface ProductSlug {
  id: string
  slug: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function isAlreadyHosted(url: string): boolean {
  if (!SUPABASE_URL) return false
  // Strip query string before comparing
  const cleanUrl = url.split('?')[0]
  return cleanUrl.startsWith(SUPABASE_URL)
}

async function main() {
  // 1. Get all scraper-source rows
  const { data: imgs, error } = await supabaseAdmin
    .from('product_images')
    .select('id, product_id, url, sort_order, is_primary')
    .eq('source', 'scraper')
    .returns<ImgRow[]>()
  if (error) {
    console.error('[storage] query failed:', error)
    process.exit(1)
  }
  if (!imgs || imgs.length === 0) {
    console.log('[storage] no scraper-source images found')
    return
  }

  // 2. Filter to non-hosted rows
  const remote = imgs.filter((img) => !isAlreadyHosted(img.url))
  if (remote.length === 0) {
    console.log(`[storage] all ${imgs.length} images already hosted on Supabase`)
    return
  }
  console.log(`[storage] ${remote.length} images to download (${imgs.length - remote.length} already hosted)`)

  // 3. Get slugs for filename suffixes
  const productIds = [...new Set(remote.map((i) => i.product_id))]
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug')
    .in('id', productIds)
    .returns<ProductSlug[]>()
  const slugMap = new Map<string, string>()
  for (const p of products ?? []) slugMap.set(p.id, p.slug)

  // 4. Process with worker pool
  let ok = 0
  let failed = 0
  const queue = [...remote]
  const worker = async () => {
    while (queue.length > 0) {
      const img = queue.shift()
      if (!img) return
      const slug = slugMap.get(img.product_id)
      if (!slug) {
        failed++
        console.warn(`  ✗ no slug for product_id=${img.product_id}`)
        continue
      }
      try {
        // Use sort_order as filename suffix → predictable filenames
        // sort_order=0 → primary suffix, slug.webp would clash with image_url
        // Use suffix = sort_order even for first to avoid collision
        const stored = await downloadAndStoreImage(img.url, slug, `g${img.sort_order}`)
        const { error: updErr } = await supabaseAdmin
          .from('product_images')
          .update({ url: stored })
          .eq('id', img.id)
        if (updErr) {
          failed++
          console.warn(`  ✗ ${slug.slice(0, 40)} sort=${img.sort_order} | ${updErr.message}`)
        } else {
          ok++
          console.log(`  ✓ ${slug.slice(0, 40)} sort=${img.sort_order}`)
        }
      } catch (err) {
        failed++
        console.warn(`  ✗ ${slug.slice(0, 40)} sort=${img.sort_order} | ${err instanceof Error ? err.message : err}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log('')
  console.log(`[storage] done — ok=${ok} failed=${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[storage] fatal:', err)
  process.exit(1)
})
