/**
 * Standalone Entity Aggregator cron runner.
 *
 * Denně přepočte cultivar.flavor_profile + intensity_score z aktuálních
 * produktů. Respektuje admin override (auto_filled_at IS NULL = nepřepisuj).
 *
 * Doporučená frekvence: 1× denně (např. 04:00 UTC, před scraperem).
 *
 * Local: npm run cron:entity-aggregate
 */
import { recomputeAllCultivars } from '@/lib/entity-aggregator'

async function main() {
  const startedAt = Date.now()
  console.log('[cron:entity-aggregate] start', new Date().toISOString())

  try {
    const result = await recomputeAllCultivars()
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:entity-aggregate] done in ${elapsedSec}s`, result)
    process.exit(0)
  } catch (err) {
    console.error('[cron:entity-aggregate] FAILED:', err)
    process.exit(1)
  }
}

main()
