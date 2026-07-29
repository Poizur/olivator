/**
 * Standalone Link-Rot cron runner.
 *
 * Denně projde affiliate URLs, mrtvé deaktivuje, znovu-žijící reaktivuje.
 * Local: npm run cron:link-check
 */
import { runLinkRotCheck, checkFeedStaleness } from '@/lib/link-rot-checker'
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

    // Feed consistency spot-check: stale in_stock=true nabídky od feedových partnerů
    try {
      const staleness = await checkFeedStaleness()
      if (staleness.staleCount > 0) {
        console.warn(`[cron:link-check] ⚠️ FEED STALENESS: ${staleness.staleCount} in_stock=true offers nebyly v posledním feed-syncu`)
        for (const o of staleness.staleOffers.slice(0, 10)) {
          console.warn(`  stale: ${o.retailerSlug} / ${o.productSlug} — last_checked: ${o.lastChecked.slice(0, 16)} (${o.price} Kč)`)
        }
        console.warn('  → Spusť: npx tsx --env-file=.env.local scripts/out-of-feed-sweep.ts')
      } else {
        console.log('[cron:link-check] feed staleness: 0 stale offers ✓')
      }
    } catch (err) {
      console.warn('[cron:link-check] feed staleness check failed:', err)
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
