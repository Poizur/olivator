import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('seo_tasks')
    .select('task_key, title, description, notes, phase')
    .in('task_key', ['localbusiness_schema', 'gsc_dashboard', 'core_web_vitals', 'ab_meta_titles', 'voice_search_optimization', 'sge_preparation', 'multilang_sk'])

  for (const t of (data ?? [])) {
    console.log(`\n[F${t.phase}] ${t.task_key}`)
    console.log(`  Title: ${t.title}`)
    console.log(`  Desc: ${t.description}`)
    if (t.notes) console.log(`  Notes: ${t.notes}`)
  }
}
main().catch(console.error)
