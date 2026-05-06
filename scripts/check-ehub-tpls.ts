async function checkEhubTplsMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin
    .from('retailers')
    .select('slug, name, base_tracking_url')
    .eq('affiliate_network', 'eHUB')
    .eq('is_active', true)
    .order('slug')
  console.log(`eHUB retaileři: ${data?.length}\n`)
  for (const r of data ?? []) {
    const tpl = r.base_tracking_url as string | null
    const hasUrl = tpl?.includes('url={product_url}') && !tpl?.includes('desturl={product_url}')
    const hasDesturl = tpl?.includes('desturl={product_url}')
    const flag = hasDesturl ? '✓ desturl OK' : hasUrl ? '✗ url= (ROZBITÉ)' : tpl ? '? jiný' : '— bez tpl'
    console.log(`  ${r.slug.padEnd(15)} ${flag}`)
    if (tpl) console.log(`    ${tpl}\n`)
  }
}

checkEhubTplsMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
