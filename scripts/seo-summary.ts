import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('seo_tasks').select('phase, status').order('phase')
  const byPhase: Record<number, { done: number; total: number; pending: number; skipped: number }> = {}
  ;(data ?? []).forEach((t: { phase: number; status: string }) => {
    const p = t.phase
    if (!byPhase[p]) byPhase[p] = { done: 0, total: 0, pending: 0, skipped: 0 }
    byPhase[p].total++
    if (t.status === 'done') byPhase[p].done++
    else if (t.status === 'skipped') byPhase[p].skipped++
    else byPhase[p].pending++
  })
  let totalDone = 0, totalCounted = 0
  for (let i = 0; i <= 7; i++) {
    const s = byPhase[i] ?? { done: 0, total: 0, pending: 0, skipped: 0 }
    const counted = s.total - s.skipped
    totalDone += s.done
    totalCounted += counted
    console.log(`F${i}: ${s.done}/${counted} (${s.skipped} skipped)`)
  }
  const pct = Math.round(totalDone / totalCounted * 100)
  console.log(`\nOVERALL: ${totalDone}/${totalCounted} = ${pct}%`)
}
main().catch(console.error)
