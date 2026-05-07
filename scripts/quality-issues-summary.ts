import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Quality issues — co se aktuálně flaguje
  const { data: issues } = await supabaseAdmin
    .from('quality_issues')
    .select('rule_id, severity, status, auto_fix_attempted, auto_fix_succeeded, message')
    .order('detected_at', { ascending: false })

  if (!issues) { console.log('No quality_issues table'); return }

  // Group by rule
  const byRule = new Map<string, { total: number; severity: string; autoTried: number; autoFixed: number; samples: string[] }>()
  for (const i of issues as Array<{ rule_id: string; severity: string; status: string; auto_fix_attempted: boolean; auto_fix_succeeded: boolean | null; message: string }>) {
    if (!byRule.has(i.rule_id)) byRule.set(i.rule_id, { total: 0, severity: i.severity, autoTried: 0, autoFixed: 0, samples: [] })
    const r = byRule.get(i.rule_id)!
    r.total++
    if (i.auto_fix_attempted) r.autoTried++
    if (i.auto_fix_succeeded) r.autoFixed++
    if (r.samples.length < 2) r.samples.push(i.message?.slice(0, 60) ?? '')
  }

  console.log('═══ Quality issues summary ═══\n')
  console.log('RULE_ID'.padEnd(35), 'SEV'.padEnd(8), 'TOTAL'.padStart(6), 'AUTOTRIED'.padStart(10), 'AUTOFIXED'.padStart(10))
  console.log('─'.repeat(80))
  for (const [rule, r] of byRule.entries()) {
    console.log(rule.padEnd(35), r.severity.padEnd(8), String(r.total).padStart(6), String(r.autoTried).padStart(10), String(r.autoFixed).padStart(10))
  }

  console.log(`\nCelkem issues: ${issues.length}`)
  console.log(`Open: ${issues.filter(i => i.status === 'open').length}`)
  console.log(`Resolved: ${issues.filter(i => i.status === 'resolved').length}`)
}
main().catch(console.error)
