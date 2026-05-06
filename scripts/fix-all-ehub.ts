async function fixAllEhubMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, base_tracking_url')
    .eq('affiliate_network', 'eHUB')
    .eq('is_active', true)
  let fixed = 0
  for (const r of retailers ?? []) {
    const tpl = r.base_tracking_url as string | null
    if (!tpl) continue
    if (tpl.includes('desturl={product_url}')) continue
    if (!tpl.includes('url={product_url}')) continue
    const newTpl = tpl.replace('url={product_url}', 'desturl={product_url}')
    await supabaseAdmin.from('retailers').update({ base_tracking_url: newTpl }).eq('id', r.id as string)
    console.log('✓ Fixed:', r.slug)
    fixed++
  }
  console.log(`\nTotal fixed: ${fixed}`)
}

fixAllEhubMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
