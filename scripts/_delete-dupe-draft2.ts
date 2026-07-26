import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin
    .from('article_drafts')
    .select('id, title, created_at')
    .eq('slug', 'olivovy-olej-pred-spanim')
    .order('created_at')
  console.log('All IDs:', data?.map(d => ({ id: d.id, title: d.title, date: d.created_at })))
  if (!data || data.length < 2) { console.log('Nothing to delete'); return }
  // Delete newer (second) one — keep older (first) which is longer
  const toDelete = data[1].id
  const { error } = await supabaseAdmin.from('article_drafts').delete().eq('id', toDelete)
  console.log(error ? `Error: ${error.message}` : `Deleted ${toDelete} (${data[1].title})`)
}
main().catch(console.error)
