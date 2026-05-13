import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { error } = await supabaseAdmin.from('project_learnings').insert({
    category: 'scoring',
    title: 'Score bonus pro funkční oleje s polyfenoly > 1500 mg/kg',
    description: 'Oleje s polyfenoly nad 1500 mg/kg dostávají aditivní bonus: +1 bod za každých 200 mg/kg nad prahem, max +10, výsledné score max 100. Příklady: EVOLIA 2777 mg/kg → +6 (79→85), EVOLIA 2012 mg/kg → +2 (77→79). Implementace: lib/score.ts (calculateScore), types.ts (ScoreBreakdown.functionalBonus), components/score-section.tsx (bonus řádek v UI), app/metodika/page.tsx (sekce id=bonus). Recalc script: scripts/recalc-scores.ts. POZOR: spouštět ze worktree adresáře, ne z main repo — jinak @/ alias importuje starou verzi lib/score bez bonusu.',
    source: 'manual',
    impact: 'medium',
  })
  if (error) {
    console.error('ERROR:', error.message)
    process.exit(1)
  }
  console.log('Lesson inserted OK')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
