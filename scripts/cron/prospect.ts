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

async function main() {
  const startedAt = Date.now()
  console.log('[cron:prospect] start', new Date().toISOString())

  try {
    const result = await runProspector()
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
