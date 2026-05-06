async function checkDraftsSourceMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, ai_generated_at, image_source, source_url, image_url, meta_description, region_slug, slug')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
  console.log(`33 drafts source analysis:\n`)
  let aiDone = 0
  let hasSource = 0
  for (const d of data ?? []) {
    if (d.ai_generated_at) aiDone++
    if (d.source_url) hasSource++
  }
  console.log(`  ai_generated_at vyplněn: ${aiDone}/${data?.length ?? 0}`)
  console.log(`  source_url vyplněn:      ${hasSource}/${data?.length ?? 0}`)
  console.log()
  console.log('Sample (slug + ai + image_source + meta + region):')
  for (const d of (data ?? []).slice(0, 8)) {
    console.log(
      `  ${d.slug?.slice(0, 50).padEnd(50)} ai:${d.ai_generated_at ? 'Y' : 'N'} img_src:${(d.image_source ?? '-').padEnd(15)} meta:${d.meta_description ? 'Y' : 'N'} region:${d.region_slug ?? '-'}`
    )
  }
}

checkDraftsSourceMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
