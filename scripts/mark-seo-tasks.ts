/**
 * Označí SEO úkoly v dashboardu jako hotové.
 * Použití: npx tsx --env-file=.env.local scripts/mark-seo-tasks.ts <key1> <key2> ...
 */
import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const keys = process.argv.slice(2)
  if (keys.length === 0) {
    console.error('Usage: tsx scripts/mark-seo-tasks.ts <task_key> [<task_key> ...]')
    process.exit(1)
  }

  const { error } = await supabaseAdmin
    .from('seo_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .in('task_key', keys)

  if (error) {
    console.error('ERROR:', error.message)
    process.exit(1)
  }
  console.log(`✅ Marked ${keys.length} úkolů done:`, keys.join(', '))
}

main().catch(console.error)
