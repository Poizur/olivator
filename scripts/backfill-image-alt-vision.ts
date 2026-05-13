/**
 * Vygeneruje AI alt texty (Claude Haiku vision) pro product_images bez alt_text.
 * Nahrazuje backfill-image-alt.ts který používal jen jméno produktu.
 *
 * Stav před spuštěním: 123 řádků bez alt_text.
 * Haiku model: ~$0.001/obrázek × 123 = ~$0.12 celkem.
 *
 * Spuštění:
 *   env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/backfill-image-alt-vision.ts
 * Jen náhled (dry run):
 *   ... scripts/backfill-image-alt-vision.ts --dry
 * Přegenerovat i existující:
 *   ... scripts/backfill-image-alt-vision.ts --force
 */
import { supabaseAdmin } from '@/lib/supabase'
import { generateImageAltText } from '@/lib/product-image'

const DELAY_MS = 500 // 2 req/s — well under Haiku limits
const isDry = process.argv.includes('--dry')
const isForce = process.argv.includes('--force')

interface ImgRow {
  id: string
  product_id: string
  url: string
  alt_text: string | null
}

interface ProductRow {
  id: string
  name: string
}

async function main() {
  // Fetch target rows
  const baseQuery = supabaseAdmin
    .from('product_images')
    .select('id, product_id, url, alt_text')
    .order('product_id', { ascending: true })

  const { data: rows, error } = isForce
    ? await baseQuery.returns<ImgRow[]>()
    : await baseQuery.or('alt_text.is.null,alt_text.eq.').returns<ImgRow[]>()

  if (error) {
    console.error('[backfill-alt-vision] query failed:', error)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('[backfill-alt-vision] no rows to process — all have alt_text')
    return
  }

  // Prefetch product names
  const productIds = [...new Set(rows.map(r => r.product_id))]
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .in('id', productIds)
    .returns<ProductRow[]>()
  const nameMap = new Map<string, string>()
  for (const p of products ?? []) nameMap.set(p.id, p.name)

  console.log(`[backfill-alt-vision] ${rows.length} images across ${productIds.length} products`)
  if (isDry) console.log('[backfill-alt-vision] DRY RUN — no DB writes')

  let ok = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = nameMap.get(row.product_id)
    if (!name) {
      console.warn(`  [${i + 1}/${rows.length}] ✗ product ${row.product_id} not found`)
      failed++
      continue
    }

    process.stdout.write(`  [${i + 1}/${rows.length}] ${name.slice(0, 35).padEnd(35)} `)

    const altText = await generateImageAltText(row.url, name)

    if (altText === name) {
      // Vision returned fallback (product name) — probably image inaccessible
      process.stdout.write(`⚠ fallback\n`)
      skipped++
    } else {
      process.stdout.write(`✓ "${altText.slice(0, 60)}"\n`)
    }

    if (!isDry) {
      const { error: updErr } = await supabaseAdmin
        .from('product_images')
        .update({ alt_text: altText })
        .eq('id', row.id)
      if (updErr) {
        console.warn(`     DB error: ${updErr.message}`)
        failed++
      } else {
        ok++
      }
    } else {
      ok++
    }

    if (i < rows.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n[backfill-alt-vision] done — ok=${ok} skipped/fallback=${skipped} failed=${failed}`)
  if (isDry) console.log('[backfill-alt-vision] was DRY RUN — rerun without --dry to persist')
  process.exit(0)
}

main().catch(err => {
  console.error('[backfill-alt-vision] fatal:', err)
  process.exit(1)
})
