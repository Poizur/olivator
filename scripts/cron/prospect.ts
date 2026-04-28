/**
 * Standalone Prospector cron runner.
 *
 * Run by Railway cron service on schedule. Walks curated shop list,
 * tests crawler, adds new shops as 'suggested'. Exits 0 on success, 1 on failure.
 *
 * Local: npm run cron:prospect
 */
import { runProspector } from '@/lib/prospector'
import { sendProspectorSummary } from '@/lib/email'

const MAX_RUNTIME_MS = 10 * 60 * 1000 // 10 minut — pak process.exit bez ohledu

async function main() {
  const startedAt = Date.now()
  console.log('[cron:prospect] start', new Date().toISOString())

  // Hard kill — pokud job visí (TCP stall, nekonečná sitemap), nezablokuje Railway
  const killTimer = setTimeout(() => {
    console.error('[cron:prospect] TIMEOUT — exceeded 10 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await runProspector()
    clearTimeout(killTimer)
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:prospect] done in ${elapsedSec}s`, {
      totalCandidates: result.totalCandidates,
      alreadyKnown: result.alreadyKnown,
      newlyAdded: result.newlyAdded,
      testedSuccess: result.testedSuccess,
      testedFailed: result.testedFailed,
    })

    try {
      await sendProspectorSummary(result)
      if (result.newlyAdded > 0) console.log('[cron:prospect] email sent')
    } catch (err) {
      console.warn('[cron:prospect] email failed:', err)
    }

    process.exit(0)
  } catch (err) {
    console.error('[cron:prospect] FAILED:', err)
    process.exit(1)
  }
}

main()
