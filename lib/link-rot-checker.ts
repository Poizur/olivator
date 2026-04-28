// Link-Rot Checker — denně projde všechny aktivní nabídky a HEAD requestne
// product_url + affiliate_url. Mrtvé (404/410/dns-fail/timeout) označí
// in_stock=false, aby nevedly /go/... do nikam.
//
// Nepoužíváme XML feedy (Heureka), takže tohle je naše vlastní strážnice
// proti link rotu. Cron: denně.

import { supabaseAdmin } from './supabase'

const REQUEST_TIMEOUT_MS = 12_000
const POLITE_DELAY_MS = 800
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; OlivatorBot/1.0; +https://olivator.cz/bot)',
  Accept: 'text/html,application/xhtml+xml',
}

export interface LinkCheckResult {
  totalChecked: number
  alive: number
  dead: number
  errored: number
  deactivated: number
  reactivated: number
  productsDeactivated: number
  productsReactivated: number
  deadOffers: Array<{
    offerId: string
    productSlug: string
    retailerName: string
    url: string
    statusCode: number | null
    reason: string
  }>
}

interface CheckOutcome {
  alive: boolean
  statusCode: number | null
  reason: string
}

/** HEAD nejdřív, pokud retailer HEAD nepodporuje (405/501), fallback na GET. */
async function probeUrl(url: string): Promise<CheckOutcome> {
  try {
    const headRes = await fetch(url, {
      method: 'HEAD',
      headers: FETCH_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (headRes.status === 405 || headRes.status === 501) {
      // HEAD not supported — try GET
      const getRes = await fetch(url, {
        method: 'GET',
        headers: FETCH_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      return interpretStatus(getRes.status)
    }
    return interpretStatus(headRes.status)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { alive: false, statusCode: null, reason: `network: ${msg.slice(0, 100)}` }
  }
}

function interpretStatus(code: number): CheckOutcome {
  if (code >= 200 && code < 300) return { alive: true, statusCode: code, reason: 'ok' }
  if (code >= 300 && code < 400) return { alive: true, statusCode: code, reason: 'redirect-followed' }
  if (code === 404 || code === 410) return { alive: false, statusCode: code, reason: code === 410 ? 'gone' : 'not found' }
  if (code === 403) return { alive: true, statusCode: code, reason: 'forbidden-but-exists' } // bot block, ne mrtvý
  if (code === 429) return { alive: true, statusCode: code, reason: 'rate-limited' }
  if (code >= 500) return { alive: true, statusCode: code, reason: 'server-error' } // dočasné, neoznačovat
  return { alive: false, statusCode: code, reason: `http ${code}` }
}

/** Hlavní entry point. Projde všechny nabídky, vrátí summary. */
export async function runLinkRotCheck(): Promise<LinkCheckResult> {
  const result: LinkCheckResult = {
    totalChecked: 0,
    alive: 0,
    dead: 0,
    errored: 0,
    deactivated: 0,
    reactivated: 0,
    productsDeactivated: 0,
    productsReactivated: 0,
    deadOffers: [],
  }

  // Sleduj product_ids u kterých se nějaký offer hnul — na konci pro ně
  // přepočítáme product.status
  const touchedProductIds = new Set<string>()

  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select(`
      id, product_id, product_url, affiliate_url, in_stock,
      products ( slug, name ),
      retailers ( name, slug )
    `)
    .order('last_checked', { ascending: true, nullsFirst: true })

  if (!offers || offers.length === 0) return result

  for (const raw of offers as unknown as Array<{
    id: string
    product_id: string
    product_url: string | null
    affiliate_url: string | null
    in_stock: boolean
    products: { slug: string; name: string } | { slug: string; name: string }[] | null
    retailers: { name: string; slug: string } | { name: string; slug: string }[] | null
  }>) {
    const url = raw.affiliate_url || raw.product_url
    if (!url) continue

    // Supabase joins někdy vrátí pole, někdy objekt — normalizuj
    const product = Array.isArray(raw.products) ? raw.products[0] : raw.products
    const retailer = Array.isArray(raw.retailers) ? raw.retailers[0] : raw.retailers

    result.totalChecked++
    const outcome = await probeUrl(url)

    if (outcome.alive) {
      result.alive++
      if (!raw.in_stock && outcome.statusCode && outcome.statusCode < 400) {
        await supabaseAdmin
          .from('product_offers')
          .update({ in_stock: true, last_checked: new Date().toISOString() })
          .eq('id', raw.id)
        result.reactivated++
        touchedProductIds.add(raw.product_id)
      } else {
        await supabaseAdmin
          .from('product_offers')
          .update({ last_checked: new Date().toISOString() })
          .eq('id', raw.id)
      }
    } else {
      result.dead++
      result.deadOffers.push({
        offerId: raw.id,
        productSlug: product?.slug ?? 'unknown',
        retailerName: retailer?.name ?? 'unknown',
        url,
        statusCode: outcome.statusCode,
        reason: outcome.reason,
      })
      // Deaktivovat (idempotentní — už může být in_stock=false)
      if (raw.in_stock) {
        await supabaseAdmin
          .from('product_offers')
          .update({ in_stock: false, last_checked: new Date().toISOString() })
          .eq('id', raw.id)
        result.deactivated++
        touchedProductIds.add(raw.product_id)
      }
    }

    await new Promise((r) => setTimeout(r, POLITE_DELAY_MS))
  }

  // ── Reconcile product.status pro každý dotčený produkt ──
  // Pravidlo: žádná živá nabídka → 'inactive'. Aspoň jedna živá → 'active'.
  // Drafty NIKDY nediráme — admin je drží mimo web vědomě.
  for (const productId of touchedProductIds) {
    const { data: prod } = await supabaseAdmin
      .from('products')
      .select('id, status, name')
      .eq('id', productId)
      .maybeSingle()
    if (!prod || prod.status === 'draft') continue

    const { data: prodOffers } = await supabaseAdmin
      .from('product_offers')
      .select('in_stock')
      .eq('product_id', productId)
    const hasLive = (prodOffers ?? []).some((o) => o.in_stock)

    if (!hasLive && prod.status === 'active') {
      await supabaseAdmin
        .from('products')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', productId)
      result.productsDeactivated++
    } else if (hasLive && prod.status === 'inactive') {
      await supabaseAdmin
        .from('products')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', productId)
      result.productsReactivated++
    }
  }

  return result
}
