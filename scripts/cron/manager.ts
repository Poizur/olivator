/**
 * Olivator Manager Agent — týdenní strategický report.
 *
 * Spuštění Railway cron každé pondělí 5:00 UTC (po discovery 4:00 + prospect 4:30).
 * Local: npm run cron:manager
 */
import { runManagerAgent } from '@/lib/manager-agent'
import { sendManagerReport } from '@/lib/email'

const MAX_RUNTIME_MS = 15 * 60 * 1000

async function main() {
  const startedAt = Date.now()
  console.log('[cron:manager] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:manager] TIMEOUT — exceeded 15 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const { reportId, report } = await runManagerAgent()
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:manager] analysis done in ${elapsedSec}s, reportId=${reportId ?? 'NOT_SAVED'}`)
    console.log(`[cron:manager] period: ${report.metrics.periodStart} – ${report.metrics.periodEnd}`)
    console.log(`[cron:manager] clicks=${report.metrics.totalClicks} candidates=${report.metrics.newCandidatesThisWeek} actions=${report.suggestedActions.length}`)

    // Email vypnutý defaultně (2026-09-21) — report se řeší v Claude Code session,
    // ne mailem. MANAGER_EMAIL_ENABLED=true jde zpátky zapnout bez dalšího kódu.
    // Data zůstávají v manager_reports bez ohledu na email.
    if (process.env.MANAGER_EMAIL_ENABLED === 'true') {
      try {
        await sendManagerReport(report)
        console.log('[cron:manager] email sent')
      } catch (err) {
        console.warn('[cron:manager] email failed:', err)
      }
    } else {
      console.log('[cron:manager] email skipped (default off — MANAGER_EMAIL_ENABLED not set)')
    }

    clearTimeout(killTimer)
    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[cron:manager] FAILED:', err)
    process.exit(1)
  }
}

main()
