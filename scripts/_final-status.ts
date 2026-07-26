import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('seo_tasks')
    .select('task_key, status, phase')
    .order('phase')
    .order('task_key')

  const grouped: Record<string, typeof data> = {}
  for (const t of (data ?? [])) {
    if (!grouped[t.status]) grouped[t.status] = []
    grouped[t.status]!.push(t)
  }

  const pending = (data ?? []).filter(t => t.status === 'pending')
  const done = (data ?? []).filter(t => t.status === 'done')
  
  console.log(`✅ DONE: ${done.length}`)
  console.log(`⏳ PENDING: ${pending.length}`)
  
  if (pending.length > 0) {
    console.log('\nZbývá:')
    for (const t of pending) console.log(`  [F${t.phase}] ${t.task_key}`)
  }
}
main().catch(console.error)
