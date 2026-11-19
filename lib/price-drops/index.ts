// lib/price-drops/index.ts
// „Nové poklesy tento týden“ (SQL view weekly_price_drops): každý skutečný pokles ceny za posledních 7 dní aspoň o 2 %,
// počítaný z jedné ceny za den. Je to informace „cena klesla z X na Y“ — slovo „sleva“ a odznak s procenty jen když
// nabídka zároveň splňuje pravidlo slevy (dealPct != null, stejná definice jako /slevy, confirmed_deals).

import { supabaseAdmin } from '@/lib/supabase'
import { warnIfCapped } from '@/lib/price'

const SITE = 'https://olivator.cz'
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
  /** Cena předchozího dne (poslední záznam dne), ne „původní“ cena obchodu. */
  priceBefore: number
  priceNow: number
  dropCzk: number
  /** Pokles proti předchozí ceně v % (≥ 2). Nezobrazovat jako slevu. */
  changePct: number
  /** Den, kdy cena klesla. */
  changedOn: string
  /** Sleva v % proti nejnižší ceně za 30 dní před zlevněním — jen když splňuje pravidlo slevy, jinak null. */
  dealPct: number | null
  hasAffiliateUrl: boolean
  ctaUrl: string
}

export interface WeeklyPriceDropsResult {
  drops: WeeklyPriceDrop[]
  updatedAt: string
  totalCount: number
}

interface DropRow {
  product_id: string
  retailer_id: string
  current_price: number
  baseline_price: number
  drop_pct: number
  current_since: string
  deal_pct: number | null
}

export async function getWeeklyPriceDrops(limit = 30): Promise<WeeklyPriceDropsResult> {
  const updatedAt = new Date().toISOString()
  const { data: rows, error } = await supabaseAdmin
    .from('weekly_price_drops')
    .select('product_id, retailer_id, current_price, baseline_price, drop_pct, current_since, deal_pct')
    .order('current_since', { ascending: false })
  if (error) {
    console.error('[price-drops] weekly_price_drops:', error.message)
    return { drops: [], updatedAt, totalCount: 0 }
  }
  const drops = warnIfCapped(rows as DropRow[] | null, 'weekly_price_drops')
  if (drops.length === 0) return { drops: [], updatedAt, totalCount: 0 }

  const productIds = [...new Set(drops.map((d) => d.product_id))]
  const [productsRes, retailersRes, anomalyRes, imagesRes, offersRes] = await Promise.all([
    supabaseAdmin.from('products').select('id, slug, name, name_short, olivator_score, image_url, volume_ml, origin_country').in('id', productIds),
    supabaseAdmin.from('retailers').select('id, slug, name').eq('is_active', true),
    supabaseAdmin.from('agent_decisions').select('payload').eq('decision_type', 'price_anomaly').gte('created_at', new Date(Date.now() - ANOMALY_WINDOW_DAYS * 86400_000).toISOString()),
    supabaseAdmin.from('product_images').select('product_id, url').in('product_id', productIds).eq('is_primary', true),
    supabaseAdmin.from('product_offers').select('product_id, retailer_id, affiliate_url').in('product_id', productIds),
  ])
  const productMap = new Map((productsRes.data ?? []).map((p) => [p.id as string, p]))
  const retailerMap = new Map((retailersRes.data ?? []).map((r) => [r.id as string, { slug: r.slug as string, name: r.name as string }]))
  const primaryImageMap = new Map((imagesRes.data ?? []).map((img) => [img.product_id as string, img.url as string]))
  const affiliateByKey = new Map((offersRes.data ?? []).map((o) => [`${o.product_id}|${o.retailer_id}`, Boolean(o.affiliate_url)]))
  const anomalyKeys = new Set<string>()
  for (const row of anomalyRes.data ?? []) {
    const p = row.payload as { product_slug?: string; retailer_slug?: string } | null
    if (p?.product_slug && p?.retailer_slug) anomalyKeys.add(`${p.product_slug}|${p.retailer_slug}`)
  }

  const out: WeeklyPriceDrop[] = []
  for (const d of drops) {
    const product = productMap.get(d.product_id)
    const retailer = retailerMap.get(d.retailer_id)
    if (!product || !retailer) continue
    if (anomalyKeys.has(`${product.slug}|${retailer.slug}`)) continue
    const changePct = Number(d.drop_pct)
    if (changePct > 50) continue  // téměř vždy datová anomálie
    const priceNow = Number(d.current_price)
    const priceBefore = Number(d.baseline_price)
    out.push({
      productId: d.product_id,
      slug: product.slug as string,
      name: (product.name_short as string | null) ?? (product.name as string),
      imageUrl: (product.image_url as string | null) ?? primaryImageMap.get(d.product_id) ?? null,
      olivatorScore: (product.olivator_score as number | null) ?? null,
      originCountry: (product.origin_country as string | null) ?? null,
      volumeMl: (product.volume_ml as number | null) ?? null,
      retailerSlug: retailer.slug,
      retailerName: retailer.name,
      priceBefore: Math.round(priceBefore),
      priceNow: Math.round(priceNow),
      dropCzk: Math.round(priceBefore - priceNow),
      changePct,
      changedOn: d.current_since,
      dealPct: d.deal_pct == null ? null : Number(d.deal_pct),
      hasAffiliateUrl: affiliateByKey.get(`${d.product_id}|${d.retailer_id}`) ?? false,
      ctaUrl: `${SITE}/go/${retailer.slug}/${product.slug as string}`,
    })
  }
  out.sort((a, b) => b.changedOn.localeCompare(a.changedOn) || b.changePct - a.changePct)
  return { drops: out.slice(0, limit), updatedAt, totalCount: out.length }
}
