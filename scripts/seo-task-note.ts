import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const [key, ...rest] = process.argv.slice(2)
  const note = rest.join(' ')
  if (!key || !note) { console.error('Usage: tsx scripts/seo-task-note.ts <task_key> <note>'); process.exit(1) }
  const { error } = await supabaseAdmin.from('seo_tasks').update({ notes: note }).eq('task_key', key)
  console.log(error ? 'ERR: ' + error.message : '✅ Note: ' + key)
}
main().catch(console.error)
