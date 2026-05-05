/**
 * Show Intini products + their cultivar links + types.
 * Run: node --env-file=.env.local --import tsx scripts/check-intini-products.ts
 */
async function checkIntiniProductsMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const slug = process.argv[2] ?? 'intini'

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, type, status')
    .eq('brand_slug', slug)
  if (!products) {
    console.log('No products')
    return
  }
  console.log(`Brand "${slug}" má ${products.length} produktů:\n`)
  for (const p of products) {
    const { data: cultivars } = await supabaseAdmin
      .from('product_cultivars')
      .select('cultivar_slug, cultivars!inner(name)')
      .eq('product_id', p.id)
    const cultivarNames = (cultivars ?? [])
      .map((c) => {
        const cu = Array.isArray(c.cultivars) ? c.cultivars[0] : c.cultivars
        return cu ? (cu as { name: string }).name : c.cultivar_slug
      })
      .join(' + ')
    console.log(`  [${p.status}] type=${p.type} cultivars="${cultivarNames || '<none>'}"`)
    console.log(`    ${p.name}`)
  }
}

checkIntiniProductsMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
