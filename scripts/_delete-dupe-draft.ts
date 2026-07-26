import { supabaseAdmin } from '@/lib/supabase'
// Smazat kratší/novější duplikát (6a099256) — oba jsou draft s tokeny,
// zachováváme 81caa18f (delší, 6479 chars)
async function main() {
  const { error } = await supabaseAdmin
    .from('article_drafts')
    .delete()
    .eq('id', '6a099256-0000-0000-0000-000000000000') // full id needed
  // Get full id first
  const { data } = await supabaseAdmin
    .from('article_drafts')
    .select('id, title')
    .like('id', '6a099256%')
  console.log('Candidates to delete:', data)
}
main().catch(console.error)
