// lib/price-drops/index.ts
// Detekuje cenové poklesy za posledních 7 dní (aktuální cena vs baseline z ~7 dní před).
// Použití: /poklesy-cen stránka, newsletter sekce "co zlevnilo", executive brief.
//
// Rozdíl od getSlevyDeals (/slevy): tamto srovnává aktuální vs 30d maximum.
// Tady srovnáváme aktuální vs cena před 7 dny — co se TENTO TÝDEN změnilo.

import { supabaseAdmin } from '@/lib/supabase'

const SITE = 'https://olivator.cz'
const DROP_PCT_THRESHOLD = 5    // % — konzistentní s price-watch-notify.ts
const DROP_CZK_THRESHOLD = 20   // Kč — konzistentní s price-watch-notify.ts
const ANOMALY_WINDOW_DAYS = 14  // exclude produkty s price_anomaly za posledních 14 dní

export interface WeeklyPriceDrop {
  productId: string
  slug: string
  name: string
  imageUrl: string | null
  olivatorScore: number | null
  originCountry: string | null
  volumeMl: number | null
  retailerSlug: string
  retailerName: string
  priceBefore: number
  priceNow: number
  dropCzk: number
  dropPct: number
  hasAffiliateUrl: boolean
  ctaUrl: string
}

export interface WeeklyPriceDropsResult {
  drops: WeeklyPriceDrop[]
  updatedAt: string
  totalCount: number
}

export async function getWeeklyPriceDrops(limit = 30): Promise<WeeklyPriceDropsResult> {
  const now = Date.now()
  // Baseline okno: cena zaznamenaná 5–10 dní před dneškem = "cena začátku týdne"
  const baselineFrom = new Date(now - 10 * 86400_000).toISOString()
  const baselineTo = new Date(now - 5 * 86400_000).toISOString()

  // 1. Načti aktuální nabídky + metadata produktů + retailery paralelně
  const [offersRes, productsRes, retailersRes] = await Promise.all([
    supabaseAdmin
      .from('product_offers')
      .select('product_id, retailer_id, price, affiliate_url')
      .eq('in_stock', true),
    supabaseAdmin
      .from('products')
      .select('id, slug, name, name_short, olivator_score, image_url, volume_ml, origin_country')
      .eq('status', 'active'),
    supabaseAdmin
      .from('retailers')
      .select('id, slug, name')
      .eq('is_active', true),
  ])

  const offers = offersRes.data ?? []
  if (offers.length === 0) return { drops: [], updatedAt: new Date().toISOString(), totalCount: 0 }

  const productMap = new Map(
    (productsRes.data ?? []).map(p => [p.id as string, p])
  )
  const retailerMap = new Map(
    (retailersRes.data ?? []).map(r => [r.id as string, { slug: r.slug as string, name: r.name as string }])
  )

  // Omez na produkty co jsou active + mají retailera
  const qualifyingOffers = offers.filter(o =>
    productMap.has(o.product_id as string) && retailerMap.has(o.retailer_id as string)
  )
  if (qualifyingOffers.length === 0) return { drops: [], updatedAt: new Date().toISOString(), totalCount: 0 }

  const qualifyingProductIds = Array.from(new Set(qualifyingOffers.map(o => o.product_id as string)))

  // 2. Baseline ceny (5–10 dní starý záznam z price_history) + anomálie paralelně
  const [historyRes, anomalyRes, imagesRes] = await Promise.all([
    supabaseAdmin
      .from('price_history')
      .select('product_id, retailer_id, price, recorded_at')
      .in('product_id', qualifyingProductIds)
      .gte('recorded_at', baselineFrom)
      .lte('recorded_at', baselineTo)
      .limit(20000),
    supabaseAdmin
      .from('agent_decisions')
      .select('payload')
      .eq('decision_type', 'price_anomaly')
      .gte('created_at', new Date(now - ANOMALY_WINDOW_DAYS * 86400_000).toISOString()),
    supabaseAdmin
      .from('product_images')
      .select('product_id, url')
      .in('product_id', qualifyingProductIds)
      .eq('is_primary', true)
      .limit(500),
  ])

  const historyData = historyRes.data ?? []
  const primaryImageMap = new Map(
    (imagesRes.data ?? []).map(img => [img.product_id as string, img.url as string])
  )

  // Sestavit sadu anomálních (product_slug, retailer_slug) párů
  const anomalyKeys = new Set<string>()
  for (const row of anomalyRes.data ?? []) {
    const p = row.payload as { product_slug?: string; retailer_slug?: string } | null
    if (p?.product_slug && p?.retailer_slug) {
      anomalyKeys.add(`${p.product_slug}|${p.retailer_slug}`)
    }
  }

  // 3. Per (product, retailer): najdi NEJNOVĚJŠÍ baseline záznam (closest to 7d ago)
  //    Klíč: "productId|retailerId"
  const baselineByKey = new Map<string, number>()
  for (const h of historyData as Array<{ product_id: string; retailer_id: string; price: number; recorded_at: string }>) {
    const key = `${h.product_id}|${h.retailer_id}`
    // Preferuj nejnovější v okně (nejblíže dnešku = nejbližší "7 dní zpět")
    const existing = baselineByKey.get(key)
    if (existing === undefined) {
      baselineByKey.set(key, h.price as number)
    } else {
      // Bereme maximální cenu z okna — konzervativnější než průměr, méně false positives
      if ((h.price as number) > existing) baselineByKey.set(key, h.price as number)
    }
  }

  // 4. Najdi poklesy
  const drops: WeeklyPriceDrop[] = []

  for (const offer of qualifyingOffers) {
    const productId = offer.product_id as string
    const retailerId = offer.retailer_id as string
    const key = `${productId}|${retailerId}`

    const baselinePrice = baselineByKey.get(key)
    if (baselinePrice === undefined) continue  // nemáme baseline → přeskočit

    const priceNow = offer.price as number
    if (priceNow >= baselinePrice) continue  // cena nestoupla nebo se nezměnila → přeskočit

    const dropCzk = Math.round(baselinePrice - priceNow)
    const dropPct = Math.round(((baselinePrice - priceNow) / baselinePrice) * 100)

    if (dropCzk < DROP_CZK_THRESHOLD && dropPct < DROP_PCT_THRESHOLD) continue

    const product = productMap.get(productId)!
    const retailer = retailerMap.get(retailerId)!

    // Exclude anomálie
    if (anomalyKeys.has(`${product.slug}|${retailer.slug}`)) continue

    // Cap 50 % — vyšší hodnoty jsou téměř vždy datová anomálie (konzistentní s pickDeals)
    if (dropPct > 50) continue

    const imageUrl = (product.image_url as string | null) ?? primaryImageMap.get(productId) ?? null

    drops.push({
      productId,
      slug: product.slug as string,
      name: (product.name_short as string | null) ?? (product.name as string),
      imageUrl,
      olivatorScore: (product.olivator_score as number | null) ?? null,
      originCountry: (product.origin_country as string | null) ?? null,
      volumeMl: (product.volume_ml as number | null) ?? null,
      retailerSlug: retailer.slug,
      retailerName: retailer.name,
      priceBefore: Math.round(baselinePrice),
      priceNow: Math.round(priceNow),
      dropCzk,
      dropPct,
      hasAffiliateUrl: !!(offer.affiliate_url as string | null),
      ctaUrl: `${SITE}/go/${retailer.slug}/${product.slug as string}`,
    })
  }

  // 5. Seřadit: % pokles DESC, pak olivator_score DESC
  drops.sort((a, b) => {
    if (b.dropPct !== a.dropPct) return b.dropPct - a.dropPct
    return (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0)
  })

  const topDrops = drops.slice(0, limit)

  return {
    drops: topDrops,
    updatedAt: new Date().toISOString(),
    totalCount: drops.length,
  }
}
