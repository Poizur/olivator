// Měsíční cenový index olivového oleje ČR.
// Defaultní chování: vypočítá předchozí kalendářní měsíc z price_history → uloží do DB.
// Flags:
//   --current    vypočítá aktuální měsíc z product_offers (pro první/manuální snapshot)
//   --dry-run    vypočítá ale neuloží
//   --month YYYY-MM  konkrétní měsíc (jen s --current nebo při nedostatku dat v history)
// Railway: cron-price-index, schedule "0 7 1 * *" (1. každého měsíce v 7:00 UTC), NO healthcheck
import { computeCurrentIndex, computeMonthFromHistory, saveSnapshot, type IndexSnapshot } from '@/lib/price-index/calculator'
import { supabaseAdmin } from '@/lib/supabase'

const IS_CURRENT = process.argv.includes('--current')
const IS_DRY_RUN = process.argv.includes('--dry-run')
const MONTH_ARG = (() => {
  const idx = process.argv.indexOf('--month')
  return idx !== -1 ? process.argv[idx + 1] : null
})()

function prevMonth(): string {
  const now = new Date()
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const m = now.getMonth() === 0 ? 12 : now.getMonth()
  return `${y}-${String(m).padStart(2, '0')}`
}

function printSnapshot(snapshot: IndexSnapshot) {
  const sep = '═'.repeat(64)
  console.log(`\n${sep}`)
  console.log(`  INDEX CEN — ${snapshot.month} (${snapshot.dataSource})`)
  console.log(sep)
  if (snapshot.dataNote) console.log(`  ⚠️  ${snapshot.dataNote}`)
  console.log()
  console.log(`  Dárkové sety vyloučeny (vrstva A):  ${snapshot.excludedGiftSet}`)
  console.log(`  Stat. outliers vyloučeny (vrstva B): ${snapshot.excludedStatGuard}`)
  if (snapshot.excludedStatGuardSlugs.length > 0) {
    for (const s of snapshot.excludedStatGuardSlugs) console.log(`    - ${s}`)
  }
  console.log()
  for (const s of snapshot.segments) {
    console.log(`  ${s.label.padEnd(30)} medián ${s.medianCzkL.toFixed(1).padStart(7)} Kč/l  (${s.productCount} produktů)`)
  }
  console.log(`\n${sep}\n`)
}

async function logToAgentDecisions(snapshot: IndexSnapshot, saved: boolean) {
  const all = snapshot.segments.find(s => s.segment === 'all')
  if (!all) return
  await supabaseAdmin.from('agent_decisions').insert({
    agent_name: 'cron:price-index',
    decision_type: 'monthly_index_computed',
    payload: {
      month: snapshot.month,
      median_czk_l: all.medianCzkL,
      product_count: all.productCount,
      retailer_count: all.retailerCount,
      data_source: snapshot.dataSource,
      saved,
      excluded_gift_sets: snapshot.excludedGiftSet,
      excluded_stat_guard: snapshot.excludedStatGuard,
      stat_guard_slugs: snapshot.excludedStatGuardSlugs.slice(0, 10),
    },
    created_at: new Date().toISOString(),
  })
}

async function main() {
  const targetMonth = MONTH_ARG ?? (IS_CURRENT ? null : prevMonth())
  console.log(`\nCron price-index spuštěn — ${IS_DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Režim: ${IS_CURRENT ? 'current (product_offers)' : `history (price_history, měsíc: ${targetMonth})`}`)

  let snapshot: IndexSnapshot
  if (IS_CURRENT) {
    snapshot = await computeCurrentIndex()
  } else {
    if (!targetMonth) throw new Error('Nelze určit cílový měsíc — použij --current nebo --month YYYY-MM')
    snapshot = await computeMonthFromHistory(targetMonth)
    // Záloha: pokud history vrátila méně než 50 produktů, přepni na product_offers
    const all = snapshot.segments.find(s => s.segment === 'all')
    if (!all || all.productCount < 50) {
      console.log(`  ⚠️  Price history: jen ${all?.productCount ?? 0} produktů — přepínám na product_offers jako zálohu`)
      snapshot = await computeCurrentIndex()
      Object.assign(snapshot, { month: targetMonth, dataNote: `Záloha: price_history měla nedostatečný vzorek pro ${targetMonth}, použita product_offers.` })
    }
  }

  printSnapshot(snapshot)

  if (IS_DRY_RUN) {
    console.log('DRY RUN — nic neuloženo.\n')
    return
  }

  await saveSnapshot(snapshot, `cron:price-index ${IS_CURRENT ? '--current' : ''}`.trim())
  console.log(`✓ Snapshot uložen do price_index_snapshots (měsíc: ${snapshot.month}, segmentů: ${snapshot.segments.length})`)

  try {
    await logToAgentDecisions(snapshot, true)
    console.log('✓ Zalogováno do agent_decisions')
  } catch (e) {
    console.warn('⚠️  agent_decisions log selhal (nekritické):', (e as Error).message)
  }

  console.log('\n✓ Hotovo\n')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
