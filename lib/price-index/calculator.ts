// Výpočet měsíčního cenového indexu olivových olejů ČR.
// Metodika: medián Kč/l z nejlevnější in-stock nabídky per produkt.
// Vstup: EVOO + virgin, status=active, volume_ml nastaven, cena max 14 dní stará.
// Medián = hlavní publikované číslo. Průměr = doplněk v metodice.
import { supabaseAdmin } from '../supabase'

export interface IndexSegment {
  segment: string
  label: string
  medianCzkL: number
  avgCzkL: number
  productCount: number
  retailerCount: number
  notes?: string
}

export interface IndexSnapshot {
  month: string
  segments: IndexSegment[]
  computedAt: string
  totalProductsConsidered: number
  totalOffersFound: number
  excludedStalePrice: number
  excludedOutlier: number
  // Filtry chyb dat — logujeme pro audit
  excludedGiftSet: number
  excludedGiftSetSlugs: string[]
  excludedStatGuard: number
  excludedStatGuardSlugs: string[]
  dataSource: 'product_offers' | 'price_history'
  dataNote?: string
}

export interface ProductRow {
  id: string
  slug: string
  name: string
  origin_country: string | null
  volume_ml: number
  type: string
}

export interface PriceItem {
  productId: string
  slug: string
  name: string
  originCountry: string | null
  priceCzkL: number
  retailerId: string
}

const MIN_PRICE_CZK_L = 50       // pod 50 Kč/l = chyba dat
const MAX_PRICE_CZK_L = 10_000   // nad 10 000 Kč/l = chyba dat
const MIN_SEGMENT_SIZE = 3       // méně = statisticky nespolehlivé
const GIFT_PATTERNS = ['sada', 'set', 'dárkov', 'balíček', 'kolekce', 'duo']
const STAT_GUARD_MULTIPLIER = 4  // vyluč pokud > 4× medián segmentu

export const SEGMENT_LABELS: Record<string, string> = {
  all: 'Celkový index (EVOO)',
  economy: 'Ekonomy (<400 Kč/l)',
  standard: 'Standard (400–800 Kč/l)',
  premium: 'Premium (800+ Kč/l)',
  'origin:GR': 'Řecko',
  'origin:IT': 'Itálie',
  'origin:ES': 'Španělsko',
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function computeAvg(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

function round1(n: number) { return Math.round(n * 10) / 10 }

function isGiftSet(name: string): boolean {
  const lower = name.toLowerCase()
  return GIFT_PATTERNS.some(p => lower.includes(p))
}

function buildSegment(items: PriceItem[], key: string, notes?: string): IndexSegment | null {
  if (items.length < MIN_SEGMENT_SIZE) return null
  const prices = items.map(i => i.priceCzkL)
  return {
    segment: key,
    label: SEGMENT_LABELS[key] ?? key,
    medianCzkL: round1(computeMedian(prices)),
    avgCzkL: round1(computeAvg(prices)),
    productCount: items.length,
    retailerCount: new Set(items.map(i => i.retailerId)).size,
    notes,
  }
}

// Sdílené jádro: z mapy nejlevnějších cen per produkt → IndexSnapshot.
// Volá se jak z computeCurrentIndex (product_offers) tak computeMonthFromHistory (price_history).
function computeFromCheapestMap(
  cheapest: Map<string, { price: number; retailerId: string }>,
  productMap: Map<string, ProductRow>,
  month: string,
  totalOffersFound: number,
  staleCount: number,
  dataSource: 'product_offers' | 'price_history',
  dataNote?: string
): IndexSnapshot {
  // Normalizace → Kč/l, outlier guard
  const rawItems: PriceItem[] = []
  let outlierCount = 0
  for (const [productId, offer] of cheapest) {
    const p = productMap.get(productId)
    if (!p?.volume_ml) continue
    const czk_l = offer.price / (p.volume_ml / 1000)
    if (czk_l < MIN_PRICE_CZK_L || czk_l > MAX_PRICE_CZK_L) { outlierCount++; continue }
    rawItems.push({ productId, slug: p.slug, name: p.name, originCountry: p.origin_country, priceCzkL: czk_l, retailerId: offer.retailerId })
  }

  // === VRSTVA A: Dárkové sety (name filter) ===
  const giftSetItems = rawItems.filter(i => isGiftSet(i.name))
  const afterA = rawItems.filter(i => !isGiftSet(i.name))

  // === VRSTVA B: Statistický guard — 4× medián segmentu (two-pass) ===
  const prelim = {
    economy: computeMedian(afterA.filter(i => i.priceCzkL < 400).map(i => i.priceCzkL)),
    standard: computeMedian(afterA.filter(i => i.priceCzkL >= 400 && i.priceCzkL < 800).map(i => i.priceCzkL)),
    premium: computeMedian(afterA.filter(i => i.priceCzkL >= 800).map(i => i.priceCzkL)),
  }
  const fallbackMedian = computeMedian(afterA.map(i => i.priceCzkL))

  const statGuardItems: PriceItem[] = []
  const items = afterA.filter(item => {
    const ref = item.priceCzkL < 400
      ? (prelim.economy || fallbackMedian)
      : item.priceCzkL < 800
      ? (prelim.standard || fallbackMedian)
      : (prelim.premium || fallbackMedian)
    if (ref > 0 && item.priceCzkL > STAT_GUARD_MULTIPLIER * ref) {
      statGuardItems.push(item)
      return false
    }
    return true
  })

  // === Segmenty ===
  const segments: IndexSegment[] = []
  const all = buildSegment(items, 'all')
  if (all) segments.push(all)
  const economy = buildSegment(items.filter(i => i.priceCzkL < 400), 'economy')
  if (economy) segments.push(economy)
  const standard = buildSegment(items.filter(i => i.priceCzkL >= 400 && i.priceCzkL < 800), 'standard')
  if (standard) segments.push(standard)
  const premium = buildSegment(items.filter(i => i.priceCzkL >= 800), 'premium')
  if (premium) segments.push(premium)
  for (const origin of ['GR', 'IT', 'ES'] as const) {
    const seg = buildSegment(items.filter(i => i.originCountry === origin), `origin:${origin}`)
    if (seg) segments.push(seg)
  }

  return {
    month,
    segments,
    computedAt: new Date().toISOString(),
    totalProductsConsidered: productMap.size,
    totalOffersFound,
    excludedStalePrice: staleCount,
    excludedOutlier: outlierCount,
    excludedGiftSet: giftSetItems.length,
    excludedGiftSetSlugs: giftSetItems.map(i => i.slug),
    excludedStatGuard: statGuardItems.length,
    excludedStatGuardSlugs: statGuardItems.map(i => `${i.slug} (${Math.round(i.priceCzkL)} Kč/l)`),
    dataSource,
    dataNote,
  }
}

// Aktuální index z product_offers (nejčerstvější data — pro manuální trigger + první snapshot).
export async function computeCurrentIndex(): Promise<IndexSnapshot> {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rawProducts, error: prodErr } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, origin_country, volume_ml, type')
    .in('type', ['evoo', 'virgin'])
    .eq('status', 'active')
    .not('volume_ml', 'is', null)
    .gt('volume_ml', 0)
  if (prodErr) throw new Error(`products: ${prodErr.message}`)

  const products = (rawProducts ?? []) as ProductRow[]
  const productMap = new Map(products.map(p => [p.id, p]))
  const productIds = products.map(p => p.id)

  const allOffers: Array<{ product_id: string; retailer_id: string; price: number }> = []
  for (let i = 0; i < productIds.length; i += 200) {
    const { data, error } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, retailer_id, price')
      .in('product_id', productIds.slice(i, i + 200))
      .eq('in_stock', true)
      .gte('last_checked', cutoff)
    if (error) throw new Error(`offers batch ${i}: ${error.message}`)
    if (data) allOffers.push(...data)
  }

  const cheapest = new Map<string, { price: number; retailerId: string }>()
  for (const o of allOffers) {
    const ex = cheapest.get(o.product_id)
    if (!ex || o.price < ex.price) cheapest.set(o.product_id, { price: o.price, retailerId: o.retailer_id })
  }

  return computeFromCheapestMap(cheapest, productMap, month, allOffers.length, productIds.length - cheapest.size, 'product_offers')
}

// Historický index z price_history pro konkrétní měsíc (pro měsíční cron).
export async function computeMonthFromHistory(targetMonth: string): Promise<IndexSnapshot> {
  const [y, m] = targetMonth.split('-').map(Number)
  const monthStart = `${targetMonth}-01T00:00:00Z`
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  const monthEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00Z`

  const { data: rawProducts, error: prodErr } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, origin_country, volume_ml, type')
    .in('type', ['evoo', 'virgin'])
    .eq('status', 'active')
    .not('volume_ml', 'is', null)
    .gt('volume_ml', 0)
  if (prodErr) throw new Error(`products: ${prodErr.message}`)

  const products = (rawProducts ?? []) as ProductRow[]
  const productMap = new Map(products.map(p => [p.id, p]))
  const productIds = products.map(p => p.id)

  // Nejlevnější cena per produkt v daném měsíci (nejnovější záznam per retailer → cheapest across retailers)
  const cheapest = new Map<string, { price: number; retailerId: string }>()
  let totalHistory = 0
  for (let i = 0; i < productIds.length; i += 200) {
    const batch = productIds.slice(i, i + 200)
    const { data: history } = await supabaseAdmin
      .from('price_history')
      .select('product_id, retailer_id, price, in_stock, recorded_at')
      .in('product_id', batch)
      .gte('recorded_at', monthStart)
      .lt('recorded_at', monthEnd)
      .eq('in_stock', true)
      .order('recorded_at', { ascending: false })
    const seen = new Set<string>()
    for (const h of (history ?? [])) {
      totalHistory++
      const key = `${h.product_id}:${h.retailer_id}`
      if (!seen.has(key)) {
        seen.add(key)
        const ex = cheapest.get(h.product_id)
        if (!ex || h.price < ex.price) cheapest.set(h.product_id, { price: h.price, retailerId: h.retailer_id })
      }
    }
  }

  const note = cheapest.size < 50
    ? `Omezený vzorek ${cheapest.size} produktů z price_history (${targetMonth}). Doporučeno pro informaci, ne pro citaci.`
    : undefined

  return computeFromCheapestMap(cheapest, productMap, targetMonth, totalHistory, productIds.length - cheapest.size, 'price_history', note)
}

// Ulož snapshot do DB. Tabulka price_index_snapshots musí existovat (migration 20260723_price_index.sql).
export async function saveSnapshot(snapshot: IndexSnapshot, sourceNote: string): Promise<void> {
  const rows = snapshot.segments.map(s => ({
    month: snapshot.month,
    segment: s.segment,
    median_czk_l: s.medianCzkL,
    avg_czk_l: s.avgCzkL,
    product_count: s.productCount,
    retailer_count: s.retailerCount,
    computed_at: snapshot.computedAt,
    notes: [sourceNote, snapshot.dataNote, s.notes].filter(Boolean).join(' | ') || null,
  }))
  const { error } = await supabaseAdmin
    .from('price_index_snapshots')
    .upsert(rows, { onConflict: 'month,segment' })
  if (error) throw new Error(`saveSnapshot: ${error.message}`)
}
