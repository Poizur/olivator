/**
 * One-shot backfill: pro produkty které mají 0 schválených obrázků
 * a >0 scraper_candidate řádků, povýší prvních 5 kandidátů na
 * source='scraper' (auto-published). První dostane is_primary=true
 * pokud produkt nemá jiný primární obrázek.
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-publish-gallery.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

const PUBLISH_COUNT = 5

interface CandidateRow {
  id: string
  product_id: string
  sort_order: number
  url: string
}

async function main() {
  // All scraper_candidate rows ordered so we keep stable selection
  const { data: candidates, error } = await supabaseAdmin
    .from('product_images')
    .select('id, product_id, sort_order, url')
    .eq('source', 'scraper_candidate')
    .order('product_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .returns<CandidateRow[]>()
  if (error) {
    console.error('[backfill] query failed:', error)
    process.exit(1)
  }
  if (!candidates || candidates.length === 0) {
    console.log('[backfill] no candidate rows found')
    return
  }

  // Group by product
  const byProduct = new Map<string, CandidateRow[]>()
  for (const c of candidates) {
    const arr = byProduct.get(c.product_id) ?? []
    arr.push(c)
    byProduct.set(c.product_id, arr)
  }

  let publishedTotal = 0
  let productsTouched = 0

  for (const [productId, rows] of byProduct) {
    // Skip if product already has approved images (admin already curated)
    const { data: existing } = await supabaseAdmin
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .neq('source', 'scraper_candidate')
      .limit(1)
    if (existing && existing.length > 0) {
      continue
    }

    const toPublish = rows.slice(0, PUBLISH_COUNT)
    if (toPublish.length === 0) continue

    // Promote first as primary, rest as plain scraper
    const promotePromises = toPublish.map((row, i) =>
      supabaseAdmin
        .from('product_images')
        .update({
          source: 'scraper',
          is_primary: i === 0,
          sort_order: i,
        })
        .eq('id', row.id)
    )
    const results = await Promise.all(promotePromises)
    const failures = results.filter((r) => r.error)
    if (failures.length > 0) {
      console.warn(`[backfill] product ${productId}: ${failures.length} updates failed`)
    } else {
      publishedTotal += toPublish.length
      productsTouched++
      console.log(`  ✓ ${productId.slice(0, 8)}... published ${toPublish.length} (of ${rows.length} candidates)`)
    }
  }

  console.log('')
  console.log(`[backfill] done — products=${productsTouched} images_published=${publishedTotal}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[backfill] fatal:', err)
  process.exit(1)
})
