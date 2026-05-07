/**
 * Označí SEO úkoly v dashboardu jako hotové. Loguje i do seo_activity_log.
 * Použití: npx tsx --env-file=.env.local scripts/mark-seo-tasks.ts <key1> <key2> ...
 */
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/seo-activity'

async function main() {
  const keys = process.argv.slice(2)
  if (keys.length === 0) {
    console.error('Usage: tsx scripts/mark-seo-tasks.ts <task_key> [<task_key> ...]')
    process.exit(1)
  }

  // Načti tasks pro log entries
  const { data: tasksBefore } = await supabaseAdmin
    .from('seo_tasks')
    .select('task_key, title, status, phase')
    .in('task_key', keys)

  const { error } = await supabaseAdmin
    .from('seo_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .in('task_key', keys)

  if (error) {
    console.error('ERROR:', error.message)
    process.exit(1)
  }

  // Log per task — jen pokud status reálně byl něco jiného než 'done'
  const tasks = (tasksBefore ?? []) as Array<{ task_key: string; title: string; status: string; phase: number }>
  for (const t of tasks) {
    if (t.status !== 'done') {
      await logActivity({
        action_type: 'task_done',
        title: t.title,
        task_key: t.task_key,
        description: `Fáze ${t.phase}: ${t.status} → done (CLI)`,
        metadata: { phase: t.phase, prev_status: t.status },
        source: 'cli',
      })
    }
  }

  console.log(`✅ Marked ${keys.length} úkolů done:`, keys.join(', '))
}

main().catch(console.error)
