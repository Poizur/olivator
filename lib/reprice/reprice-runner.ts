import { supabaseAdmin } from '@/lib/supabase'
import { logAgentAction } from '@/lib/audit-log'
import { fetchPrice } from './price-fetcher'

// olivum odstraněno 2026-07-24 na žádost provozovatele
const MODE_A_RETAILERS = ['greekmarket', 'milujemekretu', 'olivarna']

const ANOMALY_THRESHOLD = 0.30        // >30% změna = skip + log
const CONSECUTIVE_404_THRESHOLD = 2   // 2× za sebou → in_stock=false
const DELAY_BETWEEN_REQUESTS_MS = 2_000
const DELAY_BETWEEN_RETAILERS_MS = 5_000

export interface RepriceStats {
  fetched: number
  matched: number
  changed: number
  anomalies: number
  failed: number
  skipped: number
  notFoundDeactivated: number  // produkty nastaveny in_stock=false po 2× 404
  dryRun: boolean
  byRetailer: Record<string, { fetched: number; changed: number; anomalies: number; failed: number }>
  notFoundUrls: string[]       // URLs s 1. 404 (logujeme do briefu, ne do stock)
}

interface OfferRow {
  id: string
  product_id: string
  retailer_id: string
  price: number | null
  in_stock: boolean | null
  product_url: string | null
  consecutive_404: number
  retailer_slug: string
  product_slug: string
}

export async function runReprice(opts: {
  dryRun?: boolean
  retailers?: string[]  // override — default = MODE_A_RETAILERS
} = {}): Promise<RepriceStats> {
  const { dryRun = false } = opts
  const retailerFilter = opts.retailers ?? MODE_A_RETAILERS

  const { data: retailers, error: rErr } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name')
    .in('slug', retailerFilter)
    .eq('is_active', true)

  if (rErr || !retailers?.length) {
    throw new Error(`Nelze načíst retailers: ${rErr?.message ?? 'žádný výsledek'}`)
  }

  const retailerIds = retailers.map((r) => r.id)

  // Zkus načíst s consecutive_404 (vyžaduje migraci 20260722_reprice_consecutive_404).
  // Pokud sloupec neexistuje (kód 42703), načti bez něj a default na 0.
  let offersWithCounter: Array<Record<string, unknown>> | null = null
  let has404Column = true

  const { data: offersA, error: oErrA } = await supabaseAdmin
    .from('product_offers')
    .select('id, product_id, retailer_id, price, in_stock, product_url, consecutive_404, products(slug), retailers(slug)')
    .in('retailer_id', retailerIds)

  if (oErrA) {
    if (oErrA.code === '42703' || oErrA.message?.includes('consecutive_404')) {
      // Sloupec ještě neexistuje — načti bez něj
      has404Column = false
      console.warn('[reprice] consecutive_404 column missing — 404 counter disabled until migration is applied')
      const { data: offersB, error: oErrB } = await supabaseAdmin
        .from('product_offers')
        .select('id, product_id, retailer_id, price, in_stock, product_url, products(slug), retailers(slug)')
        .in('retailer_id', retailerIds)
      if (oErrB || !offersB) throw new Error(`Nelze načíst offers: ${oErrB?.message ?? 'žádný výsledek'}`)
      offersWithCounter = offersB as Array<Record<string, unknown>>
    } else {
      throw new Error(`Nelze načíst offers: ${oErrA.message}`)
    }
  } else {
    if (!offersA) throw new Error('Nelze načíst offers: žádný výsledek')
    offersWithCounter = offersA as Array<Record<string, unknown>>
  }

  const normalizedOffers: OfferRow[] = offersWithCounter.map((o) => ({
    id: o.id as string,
    product_id: o.product_id as string,
    retailer_id: o.retailer_id as string,
    price: o.price as number | null,
    in_stock: o.in_stock as boolean | null,
    product_url: o.product_url as string | null,
    consecutive_404: has404Column ? ((o.consecutive_404 as number | null) ?? 0) : 0,
    retailer_slug: (o.retailers as unknown as { slug: string } | null)?.slug ?? '',
    product_slug: (o.products as unknown as { slug: string } | null)?.slug ?? '',
  }))

  const byRetailer = new Map<string, OfferRow[]>()
  for (const offer of normalizedOffers) {
    const slug = offer.retailer_slug
    if (!byRetailer.has(slug)) byRetailer.set(slug, [])
    byRetailer.get(slug)!.push(offer)
  }

  const stats: RepriceStats = {
    fetched: 0, matched: 0, changed: 0, anomalies: 0, failed: 0, skipped: 0,
    notFoundDeactivated: 0, dryRun, byRetailer: {}, notFoundUrls: [],
  }

  for (const [retailerSlug, retailerOffers] of byRetailer) {
    console.log(`\n[reprice] ${retailerSlug} — ${retailerOffers.length} nabídek`)
    stats.byRetailer[retailerSlug] = { fetched: 0, changed: 0, anomalies: 0, failed: 0 }
    const rs = stats.byRetailer[retailerSlug]

    for (let i = 0; i < retailerOffers.length; i++) {
      const offer = retailerOffers[i]

      if (!offer.product_url) {
        stats.skipped++
        continue
      }

      if (i > 0) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS))
      }

      const result = await fetchPrice(offer.product_url)
      stats.fetched++
      rs.fetched++

      // ── 404 handling ────────────────────────────────────────────────────────
      if (result.httpStatus === 404) {
        stats.failed++
        rs.failed++
        const newCount = has404Column ? offer.consecutive_404 + 1 : 1
        const willDeactivate = has404Column && newCount >= CONSECUTIVE_404_THRESHOLD

        console.log(
          `  404   [${offer.product_slug}] consecutive=${newCount}` +
          (willDeactivate ? ' → DEAKTIVUJI in_stock=false' : ' → loguju (1. 404)'),
        )

        stats.notFoundUrls.push(offer.product_url)

        if (!dryRun) {
          const updatePayload: Record<string, unknown> = {
            last_checked: new Date().toISOString(),
          }
          if (has404Column) updatePayload.consecutive_404 = newCount
          if (willDeactivate) {
            updatePayload.in_stock = false
            stats.notFoundDeactivated++
            stats.notFoundUrls.pop() // bude deaktivován, nestačí jen logovat
            void logAgentAction({
              agentName: 'reprice',
              decisionType: 'offer_deactivated',
              payload: {
                offer_id: offer.id,
                target_slug: offer.product_slug,
                retailer_slug: retailerSlug,
                reason: '404_consecutive',
                consecutive_404: newCount,
                url: offer.product_url,
              },
            })
          }
          await supabaseAdmin.from('product_offers').update(updatePayload).eq('id', offer.id)
        }
        continue
      }

      // ── Jiný HTTP error nebo price=null ─────────────────────────────────────
      if (result.error || result.price === null) {
        stats.failed++
        rs.failed++
        console.log(`  FAIL  [${offer.product_slug}] ${result.error ?? 'price=null'} (HTTP ${result.httpStatus})`)
        if (!dryRun) {
          await supabaseAdmin
            .from('product_offers')
            .update({ last_checked: new Date().toISOString() })
            .eq('id', offer.id)
        }
        continue
      }

      // ── Úspěšný fetch → reset 404 counter ───────────────────────────────────
      const newPrice = result.price
      const oldPrice = offer.price

      // Anomaly guard
      if (oldPrice !== null && oldPrice > 0) {
        const ratio = Math.abs(newPrice / oldPrice - 1)
        if (ratio > ANOMALY_THRESHOLD) {
          stats.anomalies++
          rs.anomalies++
          console.log(`  ANOMALY [${offer.product_slug}] old=${oldPrice} new=${newPrice} ratio=${(ratio * 100).toFixed(1)}% — skip`)
          if (!dryRun) {
            await supabaseAdmin.from('agent_decisions').insert({
              agent_name: 'reprice',
              decision_type: 'price_anomaly',
              payload: {
                offer_id: offer.id,
                product_slug: offer.product_slug,
                retailer_slug: retailerSlug,
                old_price: oldPrice,
                new_price: newPrice,
                ratio: Math.round(ratio * 1000) / 1000,
                product_url: offer.product_url,
                source: result.source,
              },
            })
            const anomalyUpdate: Record<string, unknown> = { last_checked: new Date().toISOString() }
            if (has404Column) anomalyUpdate.consecutive_404 = 0
            await supabaseAdmin.from('product_offers').update(anomalyUpdate).eq('id', offer.id)
          }
          continue
        }
      }

      const priceChanged = oldPrice === null || Math.abs(newPrice - oldPrice) > 0.01
      const stockChanged = result.inStock !== null && result.inStock !== offer.in_stock

      if (priceChanged) {
        stats.changed++
        rs.changed++
        console.log(`  CHANGE [${offer.product_slug}] ${oldPrice ?? 'null'} → ${newPrice} (${result.source})${stockChanged ? ' [stock changed]' : ''}`)
        void logAgentAction({
          agentName: 'reprice',
          decisionType: 'price_changed',
          payload: {
            offer_id: offer.id,
            target_slug: offer.product_slug,
            retailer_slug: retailerSlug,
            old_price: oldPrice,
            new_price: newPrice,
            direction: oldPrice !== null && newPrice < oldPrice ? 'down' : 'up',
            source: result.source,
          },
        })
      } else {
        stats.matched++
        console.log(`  OK     [${offer.product_slug}] ${newPrice} = DB (${result.source})`)
      }

      if (!dryRun) {
        const now = new Date().toISOString()

        await supabaseAdmin.from('price_history').insert({
          product_id: offer.product_id,
          retailer_id: offer.retailer_id,
          price: newPrice,
          in_stock: result.inStock ?? offer.in_stock,
          recorded_at: now,
        })

        const updatePayload: Record<string, unknown> = { last_checked: now }
        if (has404Column) updatePayload.consecutive_404 = 0  // reset při úspěšném fetchi
        if (priceChanged) {
          updatePayload.price = newPrice
          updatePayload.last_price_change = now
        }
        if (stockChanged && result.inStock !== null) {
          updatePayload.in_stock = result.inStock
        }

        await supabaseAdmin.from('product_offers').update(updatePayload).eq('id', offer.id)
      }
    }

    if (byRetailer.size > 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_RETAILERS_MS))
    }
  }

  return stats
}
