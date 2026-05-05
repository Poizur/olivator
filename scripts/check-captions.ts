/**
 * Check which photos have captions/subjects.
 * Run: node --env-file=.env.local --import tsx scripts/check-captions.ts
 */
async function checkCaptionsMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data: brand } = await supabaseAdmin.from('brands').select('id').eq('slug', 'intini').maybeSingle()
  if (!brand) {
    console.log('No brand')
    return
  }
  const { data: photos } = await supabaseAdmin
    .from('entity_images')
    .select('url, caption, subject, suggested_role, image_role, status')
    .eq('entity_id', brand.id)
    .eq('entity_type', 'brand')
    .order('sort_order')
  console.log(`Total photos: ${photos?.length ?? 0}`)
  let withCaption = 0
  let withSubject = 0
  for (const p of photos ?? []) {
    if (p.caption) withCaption++
    if (p.subject) withSubject++
    console.log(
      `  role=${p.image_role} status=${p.status} subject=${p.subject ?? '-'} caption="${p.caption?.slice(0, 60) ?? ''}"`
    )
  }
  console.log(`\nWith caption: ${withCaption}/${photos?.length ?? 0}`)
  console.log(`With subject: ${withSubject}/${photos?.length ?? 0}`)
}

checkCaptionsMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
