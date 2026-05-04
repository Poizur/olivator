/**
 * Olivator Learning Agent — týdenní extrakt poučení z provozních incidentů.
 *
 * Spuštění Railway cron každé pondělí 08:00 UTC.
 * Local: npm run cron:learning
 */
import { runLearningExtraction } from '@/lib/learning-agent'

const MAX_RUNTIME_MS = 15 * 60 * 1000

async function main() {
  const startedAt = Date.now()
  console.log('[cron:learning] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:learning] TIMEOUT — exceeded 15 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await runLearningExtraction({ hoursBack: 24 * 7 })
    clearTimeout(killTimer)
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:learning] done in ${elapsedSec}s`, {
      totalIncidents: result.totalIncidents,
      accepted: result.accepted,
      rejectedDuplicate: result.rejectedDuplicate,
      rejectedNotWorth: result.rejectedNotWorth,
      byCategory: result.byCategory,
      errors: result.errors.length,
    })
    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[cron:learning] FAILED:', err)
    process.exit(1)
  }
}

main()
