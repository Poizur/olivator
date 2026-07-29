/**
 * Denní Playwright ověření dostupnosti a ceny u všech in_stock nabídek.
 *
 * - Self-healing: nedostupné → in_stock=false okamžitě
 * - Cenová korekce: |stránka - feed| >5 % → page_price + price_mismatch=true
 * - Manual override respektován (Erato pattern)
 * - Výstup: řádek do denního briefu v agent_decisions
 *
 * Railway: Cron Job service, "0 1 * * *" (01:00 UTC, před feed-syncem ve 04:00)
 * Local:   npm run cron:web-check
 */
import { runWebCheck } from '@/lib/web-price-checker'

const MAX_RUNTIME_MS = 14 * 60 * 1000 // 14 min hard limit

async function main() {
  console.log('[cron:web-check] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:web-check] TIMEOUT — 14 min překročeno, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await runWebCheck()
    clearTimeout(killTimer)

    console.log('[cron:web-check] done', {
      totalChecked: result.totalChecked,
      availabilityFixed: result.availabilityFixed,
      priceMismatches: result.priceMismatches,
      errors: result.errors,
    })

    if (result.availabilityFixed > 0) {
      console.log(`[cron:web-check] ⚠️ ${result.availabilityFixed} nabídek opraveno (in_stock=false):`)
      for (const d of result.details.filter(d => !d.available && !d.manualOverride)) {
        console.log(`  ✗ ${d.productSlug} @ ${d.retailerSlug}: ${d.reason}`)
      }
    }

    if (result.priceMismatches > 0) {
      console.log(`[cron:web-check] 💰 ${result.priceMismatches} cenových neshod (feed≠stránka):`)
      for (const d of result.details.filter(d => d.priceMismatch)) {
        const diff = d.pagePrice != null ? ((d.pagePrice - d.feedPrice) / d.feedPrice * 100).toFixed(1) : '?'
        console.log(`  ~ ${d.productSlug}: feed=${d.feedPrice} Kč, stránka=${d.pagePrice} Kč (${diff} %)`)
      }
    }

    process.exit(0)
  } catch (err) {
    console.error('[cron:web-check] FAILED:', err)
    process.exit(1)
  }
}

main()
