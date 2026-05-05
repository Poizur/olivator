/**
 * Show timeline for a brand slug.
 * Run: node --env-file=.env.local --import tsx scripts/check-timeline.ts intini
 */
async function checkTimelineMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const slug = process.argv[2] ?? 'intini'
  const { data } = await supabaseAdmin
    .from('brands')
    .select('slug, name, timeline')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) {
    console.log('Brand not found')
    return
  }
  console.log(`Brand: ${data.name} (${data.slug})\n`)
  const tl = data.timeline as Array<{ year: number; label: string; description?: string }> | null
  if (!tl || !Array.isArray(tl)) {
    console.log('No timeline')
    return
  }
  for (const m of tl) {
    console.log(`  ${m.year}: ${m.label}`)
    if (m.description) console.log(`         ${m.description}`)
  }
}

checkTimelineMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
