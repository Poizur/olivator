async function checkRetailerLogosMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin
    .from('retailers')
    .select('slug, name, logo_url, domain')
    .eq('is_active', true)
    .order('slug')
  console.log(`Active retailers: ${data?.length}\n`)
  for (const r of data ?? []) {
    const logo = r.logo_url ? '✓ ' + (r.logo_url as string).slice(0, 80) : '✗ NULL'
    console.log(`  ${r.slug.padEnd(20)} ${logo}`)
  }
}

checkRetailerLogosMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
