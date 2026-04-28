/**
 * Olivator Manager Agent — týdenní strategický report.
 *
 * Spuštění Railway cron každé pondělí 5:00 UTC (po discovery 4:00 + prospect 4:30).
 * Local: npm run cron:manager
 */
import { runManagerAgent } from '@/lib/manager-agent'
import { sendManagerReport } from '@/lib/email'

async function main() {
  const startedAt = Date.now()
  console.log('[cron:manager] start', new Date().toISOString())

  try {
    const { reportId, report } = await runManagerAgent()
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:manager] analysis done in ${elapsedSec}s, reportId=${reportId ?? 'NOT_SAVED'}`)
    console.log(`[cron:manager] period: ${report.metrics.periodStart} – ${report.metrics.periodEnd}`)
    console.log(`[cron:manager] clicks=${report.metrics.totalClicks} candidates=${report.metrics.newCandidatesThisWeek} actions=${report.suggestedActions.length}`)

    try {
      await sendManagerReport(report)
      console.log('[cron:manager] email sent')
    } catch (err) {
      console.warn('[cron:manager] email failed:', err)
    }

    process.exit(0)
  } catch (err) {
    console.error('[cron:manager] FAILED:', err)
    process.exit(1)
  }
}

main()
