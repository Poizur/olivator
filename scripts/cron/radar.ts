/**
 * Standalone Olivator Radar cron runner.
 *
 * Každé 2 hodiny: fetch RSS olivových feedů, dedup, AI překlad, uloz do
 * radar_items. Public stránka /radar zobrazuje výsledek.
 *
 * Local: npm run cron:radar
 */
import { runRadarAgent } from '@/lib/radar-agent'

const MAX_RUNTIME_MS = 10 * 60 * 1000

async function main() {
  const startedAt = Date.now()
  console.log('[cron:radar] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:radar] TIMEOUT — exceeded 10 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await runRadarAgent({ hoursBack: 4, maxItems: 5 })
    clearTimeout(killTimer)
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:radar] done in ${elapsedSec}s`, {
      itemsTotal: result.itemsTotal,
      itemsAfterSignal: result.itemsAfterSignal,
      itemsAfterFpDedup: result.itemsAfterFpDedup,
      itemsAfterHaikuDedup: result.itemsAfterHaikuDedup,
      itemsSaved: result.itemsSaved,
      errors: result.errors.length,
    })
    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[cron:radar] FAILED:', err)
    process.exit(1)
  }
}

main()
