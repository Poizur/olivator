/**
 * AI Ředitel — týdenní executive brief.
 * Cron: neděle 20:00 UTC (0 20 * * 0)
 * Local: npm run cron:executive-brief
 * Dry-run: npm run cron:executive-brief -- --dry-run
 */
import { generateExecutiveBrief } from '@/lib/executive-director'
import { sendBriefNotification } from '@/lib/email'

const MAX_RUNTIME_MS = 10 * 60 * 1000
const DRY_RUN = process.argv.includes('--dry-run')
const TEST_FAILOPEN = process.argv.includes('--test-failopen')

async function main() {
  const startedAt = Date.now()
  console.log('[cron:executive-brief] start', new Date().toISOString(), DRY_RUN ? '(DRY-RUN)' : '')

  const killTimer = setTimeout(() => {
    console.error('[cron:executive-brief] TIMEOUT — exceeded 10 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await generateExecutiveBrief({ dryRun: DRY_RUN || TEST_FAILOPEN, testFailOpen: TEST_FAILOPEN })
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:executive-brief] done in ${elapsedSec}s`)
    console.log(`  weekLabel=${result.weekLabel}`)
    console.log(`  briefId=${result.briefId}`)
    console.log(`  decisions=${result.decisionCount}`)
    if (result.tokenUsage) {
      const t = result.tokenUsage
      console.log(`  tokens: ${t.inputTokens} in + ${t.outputTokens} out | cost: ~$${t.estimatedCostUsd.toFixed(4)} USD | generation: ${t.generationMs}ms`)
    }
    if (result.error) console.warn(`  warning: ${result.error}`)

    if (!DRY_RUN && result.briefId !== 'dry-run') {
      try {
        await sendBriefNotification({ briefId: result.briefId, weekLabel: result.weekLabel, decisionCount: result.decisionCount })
        console.log('[cron:executive-brief] email notification sent')
      } catch (err) {
        console.warn('[cron:executive-brief] email failed (non-fatal):', err)
      }
    }

    clearTimeout(killTimer)
    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[cron:executive-brief] FAILED:', err)
    process.exit(1)
  }
}

main()
