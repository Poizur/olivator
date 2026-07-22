import { runReprice } from '@/lib/reprice/reprice-runner'

const KILL_TIMER_MS = 25 * 60 * 1000
const isDryRun = process.argv.includes('--dry-run')

// --retailers=olivum,greekmarket,milujemekretu  (optional override)
const retailersArg = process.argv.find((a) => a.startsWith('--retailers='))
const retailers = retailersArg ? retailersArg.slice('--retailers='.length).split(',') : undefined

const killTimer = setTimeout(() => {
  console.error('[reprice] Kill timer: přesáhnut 25 min limit, ukončuji')
  process.exit(2)
}, KILL_TIMER_MS)
killTimer.unref()

async function main() {
  console.log(`[reprice] Start ${new Date().toISOString()} dryRun=${isDryRun} retailers=${retailers?.join(',') ?? 'all MODE_A'}`)

  try {
    const stats = await runReprice({ dryRun: isDryRun, retailers })

    console.log('\n[reprice] ══════════════════════════════')
    console.log('[reprice] VÝSLEDKY:')
    console.log(`  Celkem fetched:      ${stats.fetched}`)
    console.log(`  Shoduje se:          ${stats.matched}`)
    console.log(`  Změny cen:           ${stats.changed}`)
    console.log(`  Anomálie (>30%):     ${stats.anomalies}`)
    console.log(`  Selhalo:             ${stats.failed}`)
    console.log(`  Chybí URL:           ${stats.skipped}`)
    console.log(`  Deaktivovány (404×2): ${stats.notFoundDeactivated}`)
    if (isDryRun) console.log('  [DRY RUN — nic nebylo zapsáno do DB]')
    console.log('[reprice] ──────────────────────────────')
    console.log('[reprice] Per retailer:')
    for (const [slug, rs] of Object.entries(stats.byRetailer)) {
      console.log(`  ${slug}: fetched=${rs.fetched} changed=${rs.changed} anomalies=${rs.anomalies} failed=${rs.failed}`)
    }
    if (stats.notFoundUrls.length > 0) {
      console.log('[reprice] URLs k ověření (1. 404 — zatím nedeaktivujeme):')
      for (const url of stats.notFoundUrls) {
        console.log(`  - ${url}`)
      }
    }
    console.log('[reprice] ══════════════════════════════')

    clearTimeout(killTimer)
    process.exit(0)
  } catch (e) {
    console.error('[reprice] FATAL:', e)
    clearTimeout(killTimer)
    process.exit(1)
  }
}

main()
