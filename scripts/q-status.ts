import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('quality_issues').select('rule_id, status, auto_fix_attempted, auto_fix_succeeded')
  const map = new Map<string, { open: number; resolved: number; dismissed: number; total: number }>()
  for (const i of (data ?? []) as Array<{ rule_id: string; status: string }>) {
    if (!map.has(i.rule_id)) map.set(i.rule_id, { open: 0, resolved: 0, dismissed: 0, total: 0 })
    const e = map.get(i.rule_id)!
    e.total++
    if (i.status === 'open') e.open++
    else if (i.status === 'resolved') e.resolved++
    else if (i.status === 'dismissed') e.dismissed++
  }
  console.log('RULE'.padEnd(35), 'TOTAL'.padStart(6), 'OPEN'.padStart(6), 'RESOLVED'.padStart(8), 'DISMISSED'.padStart(9))
  for (const [rule, e] of map.entries()) {
    console.log(rule.padEnd(35), String(e.total).padStart(6), String(e.open).padStart(6), String(e.resolved).padStart(8), String(e.dismissed).padStart(9))
  }
}
main().catch(console.error)
