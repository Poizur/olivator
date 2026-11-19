// Hlídání cen — rozhodnutí, zda poslat upozornění. Všude cena, kterou zákazník zaplatí (akční, pokud je nižší).
// Pojistka proti falešnému „cena klesla“: výchozí cena = nižší z uložené ceny a ceny, kterou šlo v okamžiku
// přihlášení / posledního upozornění opravdu zaplatit podle price_history (ukládá efektivní cenu). Dřívější
// přihlášení ukládala běžnou cenu i v době, kdy platila akční — samotný přechod na akční cenu by pak vypadal jako pokles.

import { supabaseAdmin } from './supabase'
import { effectivePrice } from './price'

export const DROP_PCT_THRESHOLD = 5
export const DROP_CZK_THRESHOLD = 20

export interface CheapestOffer {
  price: number
  retailerName: string
  retailerSlug: string
}

export interface WatchInput {
  product_id: string
  price_at_signup: number | null
  last_notified_price: number | null
  last_notified_at: string | null
  created_at: string
}

export interface WatchDecision {
  notify: boolean
  reason: string
  currentPrice?: number
  refPrice?: number
  storedRef?: number
  historyRef?: number | null
  offer?: CheapestOffer
}

export async function cheapestEffectiveOffer(productId: string): Promise<CheapestOffer | null> {
  const { data } = await supabaseAdmin
    .from('product_offers')
    .select('price, action_price, retailers!inner(name, slug, is_active)')
    .eq('retailers.is_active', true)
    .eq('product_id', productId)
    .eq('in_stock', true)
  const offers = ((data ?? []) as unknown as { price: number; action_price: number | null; retailers: { name: string; slug: string } }[])
    .filter((o) => o.price != null && o.retailers)
    .map((o) => ({ price: effectivePrice(o.price, o.action_price), retailerName: o.retailers.name, retailerSlug: o.retailers.slug }))
    .sort((a, b) => a.price - b.price)
  return offers[0] ?? null
}

/** Nejnižší cena přes obchody, kterou šlo zaplatit v okamžiku `at` (poslední záznam každého obchodu za 30 dní před). */
export async function effectivePriceAt(productId: string, at: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('price_history')
    .select('retailer_id, price, in_stock, recorded_at')
    .eq('product_id', productId)
    .lte('recorded_at', at)
    .gte('recorded_at', new Date(Date.parse(at) - 30 * 86400_000).toISOString())
    .order('recorded_at', { ascending: false })
  const latest = new Map<string, number>()
  for (const r of data ?? []) {
    const key = r.retailer_id as string
    if (latest.has(key)) continue
    if (r.in_stock === false) { latest.set(key, Infinity); continue }
    latest.set(key, Number(r.price))
  }
  const prices = [...latest.values()].filter((p) => Number.isFinite(p) && p > 0)
  return prices.length > 0 ? Math.min(...prices) : null
}

export async function evaluateWatch(w: WatchInput): Promise<WatchDecision> {
  const offer = await cheapestEffectiveOffer(w.product_id)
  if (!offer) return { notify: false, reason: 'žádná nabídka skladem u aktivního obchodu' }
  const storedRef = Number(w.last_notified_price ?? w.price_at_signup)
  if (!storedRef) return { notify: false, reason: 'chybí výchozí cena', currentPrice: offer.price, offer }
  const historyRef = await effectivePriceAt(w.product_id, w.last_notified_at ?? w.created_at)
  const refPrice = historyRef != null ? Math.min(storedRef, historyRef) : storedRef
  const drop = refPrice - offer.price
  const pct = (drop / refPrice) * 100
  const base = { currentPrice: offer.price, refPrice, storedRef, historyRef, offer }
  if (drop < DROP_CZK_THRESHOLD && pct < DROP_PCT_THRESHOLD) {
    return { notify: false, reason: `bez poklesu: výchozí ${refPrice} Kč, teď ${offer.price} Kč`, ...base }
  }
  return { notify: true, reason: `${refPrice} → ${offer.price} Kč (−${Math.round(pct)} %, −${Math.round(drop)} Kč) u ${offer.retailerName}`, ...base }
}
