import { supabaseAdmin } from '../lib/supabase'

async function main() {
  // Fetch all remaining draft brands
  const { data: drafts, error: fe } = await supabaseAdmin
    .from('brands')
    .select('slug, name, country_code')
    .eq('status', 'draft')
    .order('slug')

  if (fe) { console.error('fetch error:', fe.message); process.exit(1) }
  
  console.log(`Found ${drafts?.length ?? 0} draft brands to hide:`)
  drafts?.forEach(b => console.log(`  ${b.slug} (${b.name}, ${b.country_code})`))

  if (!drafts || drafts.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const slugs = drafts.map(b => b.slug)
  
  const { data: updated, error: ue } = await supabaseAdmin
    .from('brands')
    .update({ status: 'hidden', updated_at: new Date().toISOString() })
    .in('slug', slugs)
    .select('slug, status')

  if (ue) {
    console.error('Update error:', ue.message)
    process.exit(1)
  }

  console.log(`\n✅ Hidden ${updated?.length ?? 0} brands`)

  // Verify final state
  const { data: final } = await supabaseAdmin
    .from('brands')
    .select('status')
  const counts: Record<string, number> = {}
  for (const b of final ?? []) counts[b.status] = (counts[b.status] ?? 0) + 1
  console.log('\nFinal brand status distribution:', JSON.stringify(counts, null, 2))
}
main().catch(console.error)
