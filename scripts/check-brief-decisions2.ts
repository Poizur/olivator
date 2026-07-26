import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('weekly_decisions')
    .select('id, decision_key, executor_rule')
    .eq('brief_id', 'a57940d4-178b-4325-82e5-9d05046af5d1')
    .eq('executor_rule', 'recalc_score')
    .maybeSingle()
  console.log(JSON.stringify(data))
}
main().catch(e => { console.error(e); process.exit(1) })
