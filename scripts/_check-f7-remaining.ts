import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin
    .from('seo_tasks')
    .select('task_key, status, phase')
    .eq('phase', 7)
    .order('task_key')
  for (const t of (data ?? [])) {
    console.log(`  ${t.status.padEnd(12)} ${t.task_key}`)
  }
}
main().catch(console.error)
