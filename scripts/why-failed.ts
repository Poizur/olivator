import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('quality_issues')
    .select('rule_id, resolution_note, auto_fix_succeeded')
    .in('rule_id', ['description_too_short', 'description_missing'])
    .eq('auto_fix_attempted', true)
    .limit(10)
  console.log('Sample failures:')
  ;(data ?? []).forEach((r: { rule_id: string; resolution_note: string | null }) =>
    console.log(`  [${r.rule_id}] ${r.resolution_note ?? 'no note'}`)
  )
}
main().catch(console.error)
