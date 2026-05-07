import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data, count } = await supabaseAdmin
    .from('discovery_candidates')
    .select('status', { count: 'exact' })
  const total = count ?? 0
  const byStatus = new Map<string, number>()
  for (const r of (data ?? []) as Array<{ status: string }>) {
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1)
  }
  console.log('Total in DB:', total)
  console.log('By status:')
  for (const [s, n] of [...byStatus.entries()].sort((a,b) => b[1]-a[1])) {
    console.log(`  ${s.padEnd(20)} ${n}`)
  }
}
main().catch(console.error)
