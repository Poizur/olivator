// Price fetcher — extrahuje cenu a dostupnost z produktové stránky eshopu.
// Bez Playwright, čistý HTTP fetch. Ceny jsou v server-side renderovaném HTML.
//
// Priorita extrakce:
//   1. OG product:price:amount  — s DPH, nejspolehlivější
//   2. JSON-LD "price"          — záloha; pokud bez DPH (~20% méně), preferuj OG
//   3. HTML pattern             — last resort pro nestandard shopy

import * as cheerio from 'cheerio'

const USER_AGENT =
  'OlivatorBot/1.0 (price-check; +https://olivator.cz/contact)'

const FETCH_TIMEOUT_MS = 12_000

export interface PriceFetchResult {
  price: number | null
  inStock: boolean | null
  source: 'og' | 'jsonld' | 'html' | null
  currency: string | null
  rawOgPrice: string | null
  rawJsonLdPrice: string | null
  httpStatus: number
  error?: string
}

function parsePrice(raw: string): number | null {
  // "1 290,00" → 1290 | "1290.50" → 1290.50 | "1290" → 1290
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null
}

function extractOgPrice(html: string): { price: number | null; currency: string | null; raw: string | null } {
  const priceMatch = html.match(/property=["']product:price:amount["'][^>]+content=["']([0-9\s.,]+)["']/i)
    ?? html.match(/content=["']([0-9\s.,]+)["'][^>]+property=["']product:price:amount["']/i)
  const currencyMatch = html.match(/property=["']product:price:currency["'][^>]+content=["']([A-Z]{3})["']/i)
    ?? html.match(/content=["']([A-Z]{3})["'][^>]+property=["']product:price:currency["']/i)

  const raw = priceMatch?.[1]?.trim() ?? null
  return {
    price: raw ? parsePrice(raw) : null,
    currency: currencyMatch?.[1] ?? null,
    raw,
  }
}

function extractJsonLdPrice($: cheerio.CheerioAPI): { price: number | null; raw: string | null } {
  let bestPrice: number | null = null
  let bestRaw: string | null = null

  $('script[type="application/ld+json"]').each((_, el) => {
    if (bestPrice !== null) return
    try {
      const text = $(el).html()
      if (!text) return
      const parsed = JSON.parse(text) as unknown
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (typeof item !== 'object' || !item) continue
        const obj = item as Record<string, unknown>
        // @type Product or Offer
        const type = (obj['@type'] as string | undefined) ?? ''
        if (type === 'Product' || type === 'Offer') {
          // offers může být objekt nebo pole (WooCommerce používá pole)
          const rawOffers = type === 'Product' ? obj['offers'] : obj
          const offerNode: Record<string, unknown> = Array.isArray(rawOffers)
            ? (rawOffers[0] as Record<string, unknown> | undefined) ?? {}
            : (rawOffers as Record<string, unknown>) ?? obj
          const priceRaw = String(offerNode['price'] ?? '')
          if (priceRaw && priceRaw !== 'undefined') {
            const p = parsePrice(priceRaw)
            if (p && p > 0) { bestPrice = p; bestRaw = priceRaw; return }
          }
        }
        // @graph arrays
        const graph = obj['@graph']
        if (Array.isArray(graph)) {
          for (const g of graph) {
            if (typeof g !== 'object' || !g) continue
            const gobj = g as Record<string, unknown>
            if ((gobj['@type'] as string) === 'Product' || (gobj['@type'] as string) === 'Offer') {
              const rawOffers = (gobj['@type'] as string) === 'Product' ? gobj['offers'] : gobj
              const offer: Record<string, unknown> = Array.isArray(rawOffers)
                ? (rawOffers[0] as Record<string, unknown> | undefined) ?? {}
                : (rawOffers as Record<string, unknown>) ?? gobj
              const priceRaw = String(offer['price'] ?? '')
              if (priceRaw && priceRaw !== 'undefined') {
                const p = parsePrice(priceRaw)
                if (p && p > 0) { bestPrice = p; bestRaw = priceRaw; return }
              }
            }
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  })
  return { price: bestPrice, raw: bestRaw }
}

function extractHtmlPrice(html: string): number | null {
  const patterns = [
    // Shoptet: data-price="1290"
    /data-price=["']([0-9]+(?:[.,][0-9]+)?)["']/i,
    // WooCommerce: class*=price><bdi>1 290 Kč
    /<bdi>([0-9\s]+(?:[.,][0-9]+)?)\s*(?:Kč|CZK)/i,
    // microdata
    /itemprop=["']price["'][^>]*>([0-9\s.,]+)/i,
    /itemprop=["']price["'][^>]+content=["']([0-9.,]+)["']/i,
  ]
  for (const pat of patterns) {
    const m = html.match(pat)
    if (m) {
      const p = parsePrice(m[1])
      if (p && p > 0) return p
    }
  }
  return null
}

function extractInStock(html: string, $: cheerio.CheerioAPI): boolean | null {
  // OG availability
  const ogAvail = html.match(/property=["']product:availability["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/content=["']([^"']+)["'][^>]+property=["']product:availability["']/i)
  if (ogAvail) {
    const val = ogAvail[1].toLowerCase()
    if (val.includes('instock') || val.includes('in_stock') || val === 'in stock') return true
    if (val.includes('outofstock') || val.includes('out_of_stock') || val.includes('preorder')) return false
  }

  // JSON-LD availability
  const ldText = $('script[type="application/ld+json"]').text()
  if (ldText.includes('schema.org/InStock')) return true
  if (ldText.includes('schema.org/OutOfStock') || ldText.includes('schema.org/SoldOut')) return false

  // Czech text signals
  const htmlLower = html.toLowerCase()
  if (/není\s+skladem|vyprodán|nedostupn/.test(htmlLower)) return false
  if (/składem|přidat\s+do\s+košíku|add[- ]to[- ]cart/.test(htmlLower)) return true

  return null
}

export async function fetchPrice(productUrl: string): Promise<PriceFetchResult> {
  let html = ''
  let httpStatus = 0

  try {
    const res = await fetch(productUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    httpStatus = res.status
    if (!res.ok) {
      return { price: null, inStock: null, source: null, currency: null,
        rawOgPrice: null, rawJsonLdPrice: null, httpStatus, error: `HTTP ${res.status}` }
    }
    html = await res.text()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { price: null, inStock: null, source: null, currency: null,
      rawOgPrice: null, rawJsonLdPrice: null, httpStatus, error: msg }
  }

  const $ = cheerio.load(html)
  const og = extractOgPrice(html)
  const jsonLd = extractJsonLdPrice($)
  const inStock = extractInStock(html, $)

  // Priorita: OG > JSON-LD (pokud OG je přibližně 12-21% vyšší než JSON-LD → OG je s DPH, preferuj)
  let price: number | null = null
  let source: PriceFetchResult['source'] = null

  if (og.price !== null) {
    price = og.price
    source = 'og'
  } else if (jsonLd.price !== null) {
    price = jsonLd.price
    source = 'jsonld'
  } else {
    const htmlP = extractHtmlPrice(html)
    if (htmlP !== null) { price = htmlP; source = 'html' }
  }

  return {
    price,
    inStock,
    source,
    currency: og.currency ?? 'CZK',
    rawOgPrice: og.raw,
    rawJsonLdPrice: jsonLd.raw,
    httpStatus,
  }
}
