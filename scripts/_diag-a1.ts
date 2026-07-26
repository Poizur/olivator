import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  // 1. Posledních 6 draftů (ordered newest first)
  const { data: drafts } = await sb.from('newsletter_drafts')
    .select('id, status, created_at, blocks, subject')
    .in('status', ['draft', 'approved', 'sent', 'archived'])
    .order('created_at', { ascending: false })
    .limit(6)

  const allDrafts = drafts ?? []
  console.log('=== POSLEDNÍCH 6 DRAFTŮ ===')
  const oilIds: string[] = []
  for (const d of allDrafts) {
    const b = (d.blocks ?? {}) as Record<string, unknown>
    const oil = (b.oilOfWeek ?? null) as { name?: string; slug?: string; productId?: string } | null
    const deals = ((b.deals ?? []) as Array<{ name?: string; productId?: string }>)
    const dealStr = deals.map(d => d.name).join(', ')
    console.log(`\n[${d.status}] ${d.id.slice(0,8)}... @ ${d.created_at?.slice(0,16)}`)
    console.log(`  oilOfWeek: "${oil?.name}" | slug: ${oil?.slug} | pid: ${oil?.productId}`)
    console.log(`  deals (${deals.length}): ${dealStr || '(empty)'}`)
    if (oil?.productId) oilIds.push(oil.productId)
  }

  // 2. Cultivar lookup pro oilOfWeek product IDs
  if (oilIds.length > 0) {
    console.log('\n=== CULTIVAR LOOKUP pro oilOfWeek IDs ===')
    const { data: cultivarRows } = await sb.from('product_cultivars')
      .select('product_id, cultivar_slug')
      .in('product_id', oilIds)
    const { data: productRows } = await sb.from('products')
      .select('id, slug, brand_slug')
      .in('id', oilIds)

    const cultivarMap = new Map<string, string[]>()
    for (const c of cultivarRows ?? []) {
      const pid = c.product_id as string
      if (!cultivarMap.has(pid)) cultivarMap.set(pid, [])
      cultivarMap.get(pid)!.push(c.cultivar_slug as string)
    }
    for (const p of productRows ?? []) {
      const cultivars = cultivarMap.get(p.id as string) ?? ['(none)']
      console.log(`  pid=${p.id?.slice(0,8)}... slug=${p.slug} brand=${p.brand_slug} cultivars=${JSON.stringify(cultivars)}`)
    }
  }

  // 3. Simuluj co composer dělá — extrahuje sentDrafts (poslední 4 sent/approved)
  console.log('\n=== COMPOSER SIMULATION ===')
  const sentDrafts = allDrafts.filter(d => d.status === 'sent' || d.status === 'approved').slice(0, 4)
  const brandProductIds2 = sentDrafts.slice(0, 2).flatMap(d => {
    const b = (d.blocks ?? {}) as Record<string, unknown>
    const oil = (b.oilOfWeek ?? null) as { productId?: string } | null
    return oil?.productId ? [oil.productId] : []
  })
  const cultivarProductIds3 = sentDrafts.slice(0, 3).flatMap(d => {
    const b = (d.blocks ?? {}) as Record<string, unknown>
    const oil = (b.oilOfWeek ?? null) as { productId?: string } | null
    return oil?.productId ? [oil.productId] : []
  })

  console.log(`sentDrafts použito: ${sentDrafts.length}`)
  console.log(`brandProductIds (last 2): ${JSON.stringify(brandProductIds2)}`)
  console.log(`cultivarProductIds (last 3): ${JSON.stringify(cultivarProductIds3)}`)

  if (brandProductIds2.length > 0) {
    const { data: brandRows } = await sb.from('products').select('id, brand_slug').in('id', brandProductIds2).not('brand_slug', 'is', null)
    const recentBrandSlugs = (brandRows ?? []).map(p => p.brand_slug as string)
    console.log(`recentBrandSlugs: ${JSON.stringify(recentBrandSlugs)}`)
  }

  if (cultivarProductIds3.length > 0) {
    const { data: cultivarRows2 } = await sb.from('product_cultivars').select('cultivar_slug').in('product_id', cultivarProductIds3)
    const recentCultivarSlugs = (cultivarRows2 ?? []).map(c => c.cultivar_slug as string)
    console.log(`recentCultivarSlugs: ${JSON.stringify(recentCultivarSlugs)}`)
    if (recentCultivarSlugs.length === 0) {
      console.log('⚠️  recentCultivarSlugs PRÁZDNÉ — pickOilOfTheWeek nedostane žádný cultivar k vyloučení!')
    }
  }
}
main().catch(console.error)
