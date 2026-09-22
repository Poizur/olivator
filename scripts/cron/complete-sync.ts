/**
 * Standalone Complete sync cron runner.
 *
 * Stahuje Reckonasbavi Complete XML feed (53 MB) a aktualizuje action_price
 * + warehouse stock pro všechny 5L olivové oleje.
 *
 * MUSÍ běžet PO feed-sync (04:00 UTC), protože PASS 1 (Heureka) maže action_price.
 * Doporučený čas: 04:15 UTC.
 *
 * Railway: přidat cron service → Start command: npm run cron:complete-sync
 * Env var povinný: RECKONASBAVI_COMPLETE_FEED_URL
 *
 * Local: npm run cron:complete-sync
 */
import { syncReckonasbavyComplete } from '@/lib/reckonasbavi-complete-sync'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_RUNTIME_MS = 5 * 60 * 1000 // 5 min — feed ~53 MB + DB updates

async function main() {
  const startedAt = Date.now()
  console.log('[cron:complete-sync] start', new Date().toISOString())

  if (!process.env.RECKONASBAVI_COMPLETE_FEED_URL) {
    console.warn('[cron:complete-sync] RECKONASBAVI_COMPLETE_FEED_URL not set — skipping')
    await supabaseAdmin.from('notification_log').insert({
      recipient: 'internal',
      subject: '[complete-sync] RECKONASBAVI_COMPLETE_FEED_URL chybí v Railway env',
      type: 'complete_sync_skipped',
      html: 'PASS 6 přeskočen — env var není nastavena. /slevy nebude mít akční ceny.',
      delivery_status: 'skipped',
      created_at: new Date().toISOString(),
    }).catch(() => {})
    process.exit(0)
  }

  const killTimer = setTimeout(() => {
    console.error('[cron:complete-sync] TIMEOUT — exceeded 5 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await syncReckonasbavyComplete()
    clearTimeout(killTimer)
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)

    if (!result) {
      console.warn('[cron:complete-sync] sync returned null — env var may have disappeared')
      process.exit(0)
    }

    console.log(`[cron:complete-sync] done in ${elapsedSec}s`, {
      feedItems: result.feedItems,
      oilsFound: result.oilsFound,
      offersUpdated: result.offersUpdated,
      overridesCleared: result.overridesCleared,
      noMatch: result.noMatch,
      errors: result.errors.length,
    })

    if (result.errors.length > 0) {
      console.warn('[cron:complete-sync] errors:', result.errors)
    }

    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[cron:complete-sync] FAILED:', err)
    process.exit(1)
  }
}

main()
