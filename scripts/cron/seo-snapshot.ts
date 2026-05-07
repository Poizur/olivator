/**
 * Daily snapshot SEO metrik — každý den ráno zachytí stav 8 klíčových metrik
 * do seo_metric_snapshots. Umožní v Historii dashboardu zobrazovat trendy.
 *
 * Schedule: `0 5 * * *` (5:00 UTC denně)
 * Run: npx tsx --env-file=.env.local scripts/cron/seo-snapshot.ts
 */
import { takeMetricSnapshot, logActivity } from '@/lib/seo-activity'

async function main() {
  const startedAt = Date.now()
  console.log('[seo-snapshot] starting daily snapshot…')

  try {
    const result = await takeMetricSnapshot()
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

    await logActivity({
      action_type: 'audit',
      title: 'Daily snapshot',
      description: `${result.snapshots} metrik uloženo (${elapsed}s)`,
      source: 'cron',
    })

    console.log(`[seo-snapshot] done — ${result.snapshots} snapshots in ${elapsed}s`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[seo-snapshot] FATAL:', msg)
    process.exit(1)
  }
}

main()
