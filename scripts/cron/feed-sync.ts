/**
 * Standalone Feed Sync cron runner.
 *
 * Projde retailery s xml_feed_url + xml_feed_format a hromadně synchronizuje
 * jejich produkty + ceny. Cesta pro shopy s strukturovaným feedem (Heureka XML).
 * Shopy bez feedu řeší cron:discovery (Playwright sitemap crawl).
 *
 * Doporučená frekvence: denně 04:00 UTC, PŘED discovery (04:30) — XML je
 * rychlé (~30 s/shop), takže discovery hned naváže s úplnou DB.
 *
 * Local: npm run cron:feed-sync
 */
import { runFeedSyncForAllRetailers } from '@/lib/feed-sync-runner'

const MAX_RUNTIME_MS = 15 * 60 * 1000 // 15 min hard limit (visící HTTP / DNS)

async function main() {
  const startedAt = Date.now()
  console.log('[cron:feed-sync] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:feed-sync] TIMEOUT — exceeded 15 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await runFeedSyncForAllRetailers()
    clearTimeout(killTimer)
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:feed-sync] done in ${elapsedSec}s`, {
      retailersChecked: result.retailersChecked,
      retailersSynced: result.retailersSynced,
      retailersFailed: result.retailersFailed,
      totalProductsCreated: result.totalProductsCreated,
      totalOffersUpserted: result.totalOffersUpserted,
      totalSkipped: result.totalSkipped,
    })
    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[cron:feed-sync] FAILED:', err)
    process.exit(1)
  }
}

main()
