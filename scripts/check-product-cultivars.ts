/**
 * Direct check of product_cultivars table for Intini.
 * Run: node --env-file=.env.local --import tsx scripts/check-product-cultivars.ts
 */
async function checkProductCultivarsMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')

  // Get Intini product IDs
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .eq('brand_slug', 'intini')
  if (!products) return
  const ids = products.map((p) => p.id as string)
  console.log(`Intini má ${ids.length} produktů\n`)

  // Direct fetch from product_cultivars
  const { data: links, error } = await supabaseAdmin
    .from('product_cultivars')
    .select('*')
    .in('product_id', ids)
  console.log(`product_cultivars rows pro Intini: ${links?.length ?? 0}`)
  if (error) console.log('Error:', error.message)
  for (const l of links ?? []) {
    const prod = products.find((p) => p.id === l.product_id)
    console.log(`  ${prod?.name} → cultivar=${l.cultivar_slug}`)
  }

  // List all cultivars again
  const { data: cultivars } = await supabaseAdmin.from('cultivars').select('slug').order('slug')
  console.log(`\nVšechny cultivary v DB (${cultivars?.length ?? 0}):`)
  for (const c of cultivars ?? []) console.log(`  - ${c.slug}`)
}

checkProductCultivarsMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
