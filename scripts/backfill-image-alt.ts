/**
 * Doplní alt_text pro product_images řádky s NULL/empty hodnotou.
 * Strategie: "{product.name}" pro is_primary, "{product.name} — pohled {N+1}"
 * pro ostatní. Skutečné popisy obrázků by vyžadovaly Claude vision per foto;
 * tohle je SEO-funkční baseline.
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-image-alt.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

interface ImgRow {
  id: string
  product_id: string
  alt_text: string | null
  is_primary: boolean
  sort_order: number
}

interface ProductRow {
  id: string
  name: string
}

async function main() {
  const { data: rows, error } = await supabaseAdmin
    .from('product_images')
    .select('id, product_id, alt_text, is_primary, sort_order')
    .or('alt_text.is.null,alt_text.eq.')
    .returns<ImgRow[]>()
  if (error) {
    console.error('[alt] query failed:', error)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('[alt] all rows already have alt_text')
    return
  }

  const productIds = [...new Set(rows.map((r) => r.product_id))]
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .in('id', productIds)
    .returns<ProductRow[]>()
  const nameMap = new Map<string, string>()
  for (const p of products ?? []) nameMap.set(p.id, p.name)

  console.log(`[alt] updating ${rows.length} rows for ${productIds.length} products`)

  let ok = 0
  let failed = 0
  for (const r of rows) {
    const name = nameMap.get(r.product_id)
    if (!name) { failed++; continue }
    const alt = r.is_primary
      ? name
      : `${name} — pohled ${(r.sort_order % 100) + 1}` // candidate sort_order >= 100, normalize
    const { error: updErr } = await supabaseAdmin
      .from('product_images')
      .update({ alt_text: alt })
      .eq('id', r.id)
    if (updErr) {
      failed++
      console.warn(`  ✗ ${r.id} | ${updErr.message}`)
    } else {
      ok++
    }
  }
  console.log(`[alt] done — ok=${ok} failed=${failed}`)
  process.exit(0)
}

main().catch((err) => { console.error('[alt] fatal:', err); process.exit(1) })
