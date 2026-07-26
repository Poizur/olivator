import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: briefs, error: be } = await supabaseAdmin
    .from('weekly_briefs')
    .select('*')
    .order('week_label', { ascending: false })
    .limit(3)
  console.log('Briefs:', JSON.stringify(briefs, null, 2), 'err:', be?.message)
  
  const { data: decisions, error: de } = await supabaseAdmin
    .from('weekly_decisions')
    .select('*')
    .order('priority', { ascending: true })
    .limit(10)
  console.log('Decisions:', JSON.stringify(decisions?.map(d => ({
    id: d.id, brief_id: d.brief_id, key: d.decision_key,
    title: d.title?.slice(0, 50), cat: d.category, prio: d.priority,
    exec: d.executor_rule
  })), null, 2), 'err:', de?.message)
}
main().catch(e => { console.error(e); process.exit(1) })
