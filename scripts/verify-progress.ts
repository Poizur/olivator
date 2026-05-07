import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  console.log('═══ Verifikace tasku 1-6 ═══\n')

  // 1. authors tabulka
  console.log('1) authors tabulka:')
  const a = await supabaseAdmin.from('authors').select('slug, name, status').limit(5)
  if (a.error) console.log(`   ❌ ${a.error.message}`)
  else {
    console.log(`   ✅ tabulka existuje, ${a.data?.length ?? 0} autorů:`)
    ;(a.data ?? []).forEach((r: { slug: string; name: string; status: string }) =>
      console.log(`      • ${r.status.padEnd(8)} ${r.slug.padEnd(20)} ${r.name}`)
    )
  }

  // 2. glossary tabulka
  console.log('\n2) glossary_terms tabulka:')
  const g = await supabaseAdmin.from('glossary_terms').select('slug, term, category, status').order('term')
  if (g.error) console.log(`   ❌ ${g.error.message}`)
  else {
    const rows = (g.data ?? []) as Array<{ slug: string; term: string; category: string; status: string }>
    console.log(`   ✅ ${rows.length} termínů:`)
    rows.forEach(r => console.log(`      • ${r.category.padEnd(13)} ${r.term}`))
  }

  // 3. Articles + recipes published
  console.log('\n3) Články + recepty status:')
  const [art, rec] = await Promise.all([
    supabaseAdmin.from('articles').select('status', { count: 'exact', head: false }).order('status'),
    supabaseAdmin.from('recipes').select('status', { count: 'exact', head: false }).order('status'),
  ])
  const aRows = (art.data ?? []) as Array<{ status: string }>
  const rRows = (rec.data ?? []) as Array<{ status: string }>
  const aActive = aRows.filter(r => r.status === 'active').length
  const aDraft = aRows.filter(r => r.status === 'draft').length
  const rActive = rRows.filter(r => r.status === 'active').length
  const rDraft = rRows.filter(r => r.status === 'draft').length
  console.log(`   Články: ${aActive} active, ${aDraft} draft`)
  console.log(`   Recepty: ${rActive} active, ${rDraft} draft`)

  // 4. Railway cron — nelze ověřit z DB, pouze přes logy
  console.log('\n4) Railway cron: nelze ověřit z DB (zkontroluj /admin/seo Historie po 24 h)')

  // 5+6. Off-page SEO (backlinky, GSC) — manuální, ongoing
  console.log('\n5-6) Backlink outreach + GSC: manuální ongoing práce, není v DB')

  // Bonus — current SEO progress
  console.log('\n═══ Aktuální SEO progress ═══')
  const tasks = await supabaseAdmin.from('seo_tasks').select('phase, status')
  const byPhase: Record<number, { done: number; total: number }> = {}
  ;(tasks.data ?? []).forEach((t: { phase: number; status: string }) => {
    const p = t.phase
    byPhase[p] = byPhase[p] || { done: 0, total: 0 }
    if (t.status !== 'skipped') byPhase[p].total++
    if (t.status === 'done') byPhase[p].done++
  })
  let totalDone = 0, totalCounted = 0
  for (let i = 0; i <= 7; i++) {
    const s = byPhase[i] ?? { done: 0, total: 0 }
    totalDone += s.done
    totalCounted += s.total
    console.log(`   F${i}: ${s.done}/${s.total}`)
  }
  console.log(`\n   OVERALL: ${totalDone}/${totalCounted} = ${Math.round(totalDone / totalCounted * 100)}%`)
}
main().catch(console.error)
