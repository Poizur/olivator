/**
 * Standalone Discovery cron runner.
 *
 * Run by Railway cron service on schedule. Imports lib/discovery-agent
 * directly — no HTTP, no timeout. Exits 0 on success, 1 on failure.
 *
 * Local: npm run cron:discovery
 */
import { runDiscoveryAgent } from '@/lib/discovery-agent'
import { sendDiscoverySummary } from '@/lib/email'

async function main() {
  const startedAt = Date.now()
  console.log('[cron:discovery] start', new Date().toISOString())

  try {
    const result = await runDiscoveryAgent()
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:discovery] done in ${elapsedSec}s`, {
      shopsCrawled: result.shopsCrawled,
      totalUrlsFound: result.totalUrlsFound,
      newCandidates: result.newCandidates,
      autoPublished: result.autoPublished,
      autoAddedOffers: result.autoAddedOffers,
      needsReview: result.needsReview,
      failed: result.failed,
    })

    try {
      await sendDiscoverySummary(result)
      console.log('[cron:discovery] email sent')
    } catch (err) {
      console.warn('[cron:discovery] email failed:', err)
    }

    process.exit(0)
  } catch (err) {
    console.error('[cron:discovery] FAILED:', err)
    process.exit(1)
  }
}

main()
