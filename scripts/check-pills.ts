import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Find any brand whose name contains "Casa" "P d o" etc
  const { data } = await supabaseAdmin.from('brands').select('slug, name, status').or('name.ilike.casa,name.ilike.p d o,name.ilike.crasto,name.ilike.adega')
  console.log('Suspicious-name brands:', data)

  // Also brands with status='draft' created today
  const { data: drafts } = await supabaseAdmin
    .from('brands')
    .select('slug, name, status, created_at')
    .eq('status', 'draft')
    .gte('created_at', '2026-05-07T19:00:00Z')
  console.log('\nDrafts created since 19:00 today:')
  ;(drafts ?? []).forEach((b: { slug: string; name: string; created_at: string }) =>
    console.log(`  slug=${b.slug.padEnd(20)} name="${b.name}" created=${b.created_at.slice(11,19)}`)
  )
}
main().catch(console.error)
