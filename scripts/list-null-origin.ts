/**
 * List products with NULL origin_country.
 * Run: node --env-file=.env.local --import tsx scripts/list-null-origin.ts
 */
async function listNullOriginMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin
    .from('products')
    .select('slug, name, brand_slug, region_slug, origin_region')
    .is('origin_country', null)
    .eq('status', 'active')
  console.log(`Active products with NULL origin_country: ${data?.length ?? 0}\n`)
  for (const p of data ?? []) {
    console.log(`  ${p.slug}`)
    console.log(`    brand=${p.brand_slug ?? '-'} region=${p.region_slug ?? '-'} origin_region=${p.origin_region ?? '-'}`)
    console.log(`    "${p.name}"`)
  }
}

listNullOriginMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
