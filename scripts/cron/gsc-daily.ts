/**
 * Standalone GSC snapshot cron — wrapper kolem lib/gsc.ts runGscDailySnapshot().
 * Spouštěj jako zálohu nebo manuální trigger; normálně běží jako PASS 7 v feed-sync.
 *
 * Schedule: 0 7 * * * (7:00 UTC — jako záloha pokud feed-sync selže)
 * Local: npm run cron:gsc-daily
 */
import { runGscDailySnapshot } from '@/lib/gsc'

const MAX_RUNTIME_MS = 3 * 60 * 1000

async function main() {
  const startedAt = Date.now()
  console.log('[cron:gsc-daily] start', new Date().toISOString())

  if (!process.env.GSC_SERVICE_ACCOUNT_KEY || !process.env.GSC_SITE_URL) {
    console.warn('[cron:gsc-daily] GSC_SERVICE_ACCOUNT_KEY nebo GSC_SITE_URL chybí — přeskakuji')
    process.exit(0)
  }

  const killTimer = setTimeout(() => {
    console.error('[cron:gsc-daily] TIMEOUT 3 min')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  const result = await runGscDailySnapshot()
  clearTimeout(killTimer)

  if (!result) {
    console.error('[cron:gsc-daily] snapshot returned null — viz logy výše')
    process.exit(1)
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000)
  console.log(`[cron:gsc-daily] upserted ${result.rowsUpserted} rows in ${elapsed}s`)
  process.exit(0)
}

main().catch(err => {
  console.error('[cron:gsc-daily] FATAL:', err)
  process.exit(1)
})
