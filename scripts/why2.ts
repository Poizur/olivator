import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('quality_issues')
    .select('rule_id, status, auto_fix_succeeded, resolution_note')
    .eq('rule_id', 'description_too_short')
    .limit(5)
  ;(data ?? []).forEach((r: { rule_id: string; status: string; auto_fix_succeeded: boolean | null; resolution_note: string | null }) =>
    console.log(`status=${r.status} succeeded=${r.auto_fix_succeeded} note=${r.resolution_note ?? '—'}`)
  )
}
main().catch(console.error)
