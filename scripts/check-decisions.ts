import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('agent_decisions')
    .select('id, decision_type, parameters, status, created_at')
    .eq('source_brief_id', 'a57940d4-178b-4325-82e5-9d05046af5d1')
    .order('created_at', { ascending: true })
  console.log(JSON.stringify(data, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
