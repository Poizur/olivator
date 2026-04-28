/**
 * Standalone Link-Rot cron runner.
 *
 * Denně projde affiliate URLs, mrtvé deaktivuje, znovu-žijící reaktivuje.
 * Local: npm run cron:link-check
 */
import { runLinkRotCheck } from '@/lib/link-rot-checker'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_RUNTIME_MS = 15 * 60 * 1000 // 15 min hard limit

async function main() {
  const startedAt = Date.now()
  console.log('[cron:link-check] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:link-check] TIMEOUT — exceeded 15 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await runLinkRotCheck()
    clearTimeout(killTimer)
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)

    console.log(`[cron:link-check] done in ${elapsedSec}s`, {
      checked: result.totalChecked,
      alive: result.alive,
      dead: result.dead,
      offersDeactivated: result.deactivated,
      offersReactivated: result.reactivated,
      productsDeactivated: result.productsDeactivated,
      productsReactivated: result.productsReactivated,
    })

    if (result.deadOffers.length > 0) {
      console.log('[cron:link-check] dead offers:')
      for (const d of result.deadOffers) {
        console.log(`  ✗ ${d.productSlug} @ ${d.retailerName}: ${d.statusCode ?? '?'} — ${d.url}`)
      }
    }

    // Audit log (nice-to-have, jen do console pokud tabulka neexistuje)
    try {
      await supabaseAdmin.from('link_check_runs').insert({
        checked: result.totalChecked,
        alive: result.alive,
        dead: result.dead,
        deactivated: result.deactivated,
        reactivated: result.reactivated,
        dead_offers: result.deadOffers,
      })
    } catch { /* tabulka volitelná */ }

    process.exit(0)
  } catch (err) {
    console.error('[cron:link-check] FAILED:', err)
    process.exit(1)
  }
}

main()
