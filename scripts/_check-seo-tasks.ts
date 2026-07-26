import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data, error } = await supabaseAdmin
    .from('seo_tasks')
    .select('task_key, status, phase, title')
    .order('phase')
    .order('task_key')

  if (error) { console.error(error.message); process.exit(1) }

  for (const t of (data ?? [])) {
    console.log(`[F${t.phase}] ${t.status.padEnd(12)} ${t.task_key}`)
  }
}

main().catch(console.error)
