// Product page scraper.
// Extracts structured data from e-commerce product pages using:
//   1. JSON-LD (Schema.org Product) — most reliable when present
//   2. OpenGraph meta tags (og:title, og:image, og:description)
//   3. Per-domain CSS selector fallbacks (reckonasbavi, Shoptet, WooCommerce)
//
// Returns a best-effort ScrapedProduct. Missing fields are null/undefined.

import * as cheerio from 'cheerio'
import { extractBrand } from './utils'

export interface ScrapedProduct {
  url: string
  domain: string

  // Identity
  name: string | null
  ean: string | null
  brand: string | null
  slug: string | null

  // Classification (heuristic from name/path)
  type: 'evoo' | 'virgin' | 'refined' | 'olive_oil' | 'pomace' | null
  originCountry: string | null
  originRegion: string | null
  volumeMl: number | null
  packaging: string | null

  // Chemistry (from description if mentioned)
  acidity: number | null
  polyphenols: number | null

  // Commerce
  price: number | null
  currency: string | null
  inStock: boolean | null

  // Media
  imageUrl: string | null

  // Content
  descriptionShort: string | null
  rawDescription: string | null // full scraped text, for AI rewrite
}

function extractFirstMatch(re: RegExp, str: string): string | null {
  const m = str.match(re)
  return m ? m[1] : null
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

function inferType(text: string): ScrapedProduct['type'] {
  const t = text.toLowerCase()
  if (/extra panensk|extra\s*virgin|evoo/.test(t)) return 'evoo'
  if (/panensk.*olivov|virgin olive/.test(t)) return 'virgin'
  if (/rafinovan|refined/.test(t)) return 'refined'
  if (/pokruti|pomace/.test(t)) return 'pomace'
  if (/olivov.*olej|olive oil/.test(t)) return 'olive_oil'
  return null
}

function inferOrigin(text: string): { country: string | null; region: string | null } {
  const t = text.toLowerCase()
  const patterns: Array<{ re: RegExp; country: string; region?: string }> = [
    { re: /\bkorfu\b|\bcorfu\b/, country: 'GR', region: 'Korfu' },
    { re: /\bkr[eé]ta\b|\bcret[ea]\b/, country: 'GR', region: 'Kréta' },
    { re: /\blesbos\b/, country: 'GR', region: 'Lesbos' },
    { re: /\bpelopon\w*/, country: 'GR', region: 'Peloponés' },
    { re: /\bkalamat\w*/, country: 'GR', region: 'Kalamata' },
    { re: /\br[eé]ck[oyá]/, country: 'GR' },
    { re: /\btoskán\w*|\btuscan\w*/, country: 'IT', region: 'Toskánsko' },
    { re: /\bsic[íi]li\w*|\bsicil\w*/, country: 'IT', region: 'Sicílie' },
    { re: /\bapulie|\bpuglia/, country: 'IT', region: 'Apulie' },
    { re: /\bital\w*/, country: 'IT' },
    { re: /\bandalus\w*/, country: 'ES', region: 'Andalusie' },
    { re: /\bc[oó]rdob\w*/, country: 'ES', region: 'Córdoba' },
    { re: /\bšpan[eě]l\w*|\bspan\w*/, country: 'ES' },
    { re: /\bistri\w*/, country: 'HR', region: 'Istrie' },
    { re: /\bchorvat\w*|\bcroatian/, country: 'HR' },
    { re: /\bportug\w*/, country: 'PT' },
    { re: /\btureck\w*|\bturkish/, country: 'TR' },
    { re: /\bmaroc\w*|\bmorocc\w*/, country: 'MA' },
    { re: /\btunis\w*/, country: 'TN' },
  ]
  for (const p of patterns) {
    if (p.re.test(t)) return { country: p.country, region: p.region ?? null }
  }
  return { country: null, region: null }
}

function inferVolumeMl(text: string): number | null {
  // matches "500 ml", "500ml", "1 l", "1l", "0,75 l", "0.75l"
  const m = text.match(/(\d+[.,]?\d*)\s*(ml|l)\b/i)
  if (!m) return null
  const num = parseFloat(m[1].replace(',', '.'))
  const unit = m[2].toLowerCase()
  const ml = unit === 'l' ? num * 1000 : num
  return Math.round(ml)
}

function inferPackaging(text: string): string | null {
  const t = text.toLowerCase()
  if (/\btmav\S* sklo|\bdark glass/.test(t)) return 'dark_glass'
  if (/\bsklo\b|\bglass\b/.test(t)) return 'dark_glass'
  if (/\bplech\b|\btin\b/.test(t)) return 'tin'
  if (/\bpet\b/.test(t)) return 'pet'
  return null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100)
}

/** Parse Schema.org JSON-LD embedded in the page. */
function parseJsonLd($: cheerio.CheerioAPI): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'object' && item !== null) results.push(item as Record<string, unknown>)
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        results.push(parsed as Record<string, unknown>)
        // Handle @graph collections
        const graph = (parsed as Record<string, unknown>)['@graph']
        if (Array.isArray(graph)) {
          for (const item of graph) {
            if (typeof item === 'object' && item !== null) results.push(item as Record<string, unknown>)
          }
        }
      }
    } catch {
      /* malformed JSON-LD — skip */
    }
  })
  return results
}

function findProductJsonLd(nodes: Record<string, unknown>[]): Record<string, unknown> | null {
  for (const node of nodes) {
    const type = node['@type']
    if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
      return node
    }
  }
  return null
}

function cleanText(s: string | null | undefined): string | null {
  if (!s) return null
  const cleaned = s.replace(/\s+/g, ' ').trim()
  return cleaned || null
}

/** Strip common shop-name suffix patterns from a product title.
 *  "Foo Oil 500ml - SHOP Name - Tagline" → "Foo Oil 500ml" */
function cleanProductName(title: string | null): string | null {
  if (!title) return null
  // Known separators used by e-shops to append their name
  const separators = [' | ', ' — ', ' – ', ' - SHOP ', ' - Shop ', ' :: ']
  let result = title
  for (const sep of separators) {
    const idx = result.indexOf(sep)
    if (idx > 15) result = result.slice(0, idx)
  }
  // Fallback: if title has 3+ " - " parts, take only first 2 joined
  // (handles "Brand - Product - Shop - Category")
  if (result === title) {
    const parts = result.split(' - ')
    if (parts.length >= 3 && parts[parts.length - 1].length > 10) {
      result = parts.slice(0, 2).join(' ')
    }
  }
  return cleanText(result)
}

/** Extract brand — uses shared extractBrand helper (handles multi-word brand whitelist). */
function inferBrand(name: string | null): string | null {
  if (!name) return null
  return extractBrand(name) || null
}

function extractAcidity(text: string | null): number | null {
  if (!text) return null
  // "acidita: 0,3%", "kyselost 0.2 %", "acidity 0.2%"
  const m = text.match(/(?:acidita|kyselost|acidity)[:\s]*(\d+[,.]?\d*)\s*%/i)
  if (!m) return null
  return parseFloat(m[1].replace(',', '.'))
}

function extractPolyphenols(text: string | null): number | null {
  if (!text) return null
  // "polyfenoly 312 mg/kg", "polyphenols: 250"
  const m = text.match(/polyfenol\w*[:\s]*(\d{2,4})/i) || text.match(/polyphenol\w*[:\s]*(\d{2,4})/i)
  if (!m) return null
  return parseInt(m[1], 10)
}

/** Main entrypoint. Fetches the URL and extracts as much as possible. */
export async function scrapeProductPage(url: string): Promise<ScrapedProduct> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Olivator/1.0; +https://olivator.cz)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const domain = extractDomain(url)

  const jsonLdNodes = parseJsonLd($)
  const product = findProductJsonLd(jsonLdNodes)

  // --- name (prefer JSON-LD which rarely has shop suffix, then clean og:title) ---
  const rawName =
    cleanText(product?.name as string | undefined) ||
    cleanText($('h1').first().text()) ||
    cleanText($('meta[property="og:title"]').attr('content')) ||
    cleanText($('title').text())
  const name = cleanProductName(rawName)

  // --- EAN / SKU ---
  let ean: string | null = null
  if (product) {
    const candidates = [product.gtin13, product.gtin, product.sku, product.mpn]
    for (const c of candidates) {
      if (typeof c === 'string' && /^\d{8,14}$/.test(c.trim())) {
        ean = c.trim()
        break
      }
    }
  }
  if (!ean) {
    // Fallback: look for "EAN: 12345" pattern in page text
    const pageText = $('body').text().slice(0, 20_000)
    const m = pageText.match(/EAN[:\s]*(\d{8,14})/i) || pageText.match(/GTIN[:\s]*(\d{8,14})/i)
    if (m) ean = m[1]
  }

  // --- brand ---
  let brand: string | null = null
  if (product?.brand) {
    if (typeof product.brand === 'string') brand = product.brand
    else if (typeof product.brand === 'object') {
      brand = (product.brand as Record<string, unknown>).name as string
    }
  }
  brand = cleanText(brand)
  // Fallback: infer brand from start of product name
  if (!brand) brand = inferBrand(name)

  // --- price ---
  let price: number | null = null
  let currency: string | null = null
  if (product?.offers) {
    const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers
    if (offers && typeof offers === 'object') {
      const o = offers as Record<string, unknown>
      if (o.price) price = parseFloat(String(o.price).replace(',', '.'))
      if (typeof o.priceCurrency === 'string') currency = o.priceCurrency
    }
  }
  if (!price) {
    // Fallback: look for price in common CSS classes
    const priceText =
      $('[itemprop="price"]').attr('content') ||
      $('.price, .product-price, .cena').first().text()
    const m = priceText && priceText.match(/(\d+[,.]?\d*)/)
    if (m) price = parseFloat(m[1].replace(',', '.'))
  }

  // --- image ---
  let imageUrl: string | null = null
  if (product?.image) {
    const img = Array.isArray(product.image) ? product.image[0] : product.image
    if (typeof img === 'string') imageUrl = img
    else if (typeof img === 'object' && img !== null) {
      imageUrl = (img as Record<string, unknown>).url as string | null
    }
  }
  imageUrl ||= cleanText($('meta[property="og:image"]').attr('content'))

  // --- description ---
  const shortDesc =
    cleanText(product?.description as string | undefined) ||
    cleanText($('meta[property="og:description"]').attr('content')) ||
    cleanText($('meta[name="description"]').attr('content'))

  const longDescSelectors = [
    '.product-description',
    '.woocommerce-product-details__short-description',
    '.product__description',
    '[itemprop="description"]',
    '#tab-description',
    '.product-full-description',
  ]
  let rawDescription: string | null = null
  for (const sel of longDescSelectors) {
    const el = $(sel).first()
    if (el.length) {
      rawDescription = cleanText(el.text())
      if (rawDescription && rawDescription.length > 50) break
    }
  }
  if (!rawDescription) rawDescription = shortDesc

  // --- inferred fields ---
  const nameForInfer = [name, rawDescription].filter(Boolean).join(' ')
  const type = inferType(nameForInfer)
  const origin = inferOrigin(nameForInfer)
  const volumeMl = inferVolumeMl(nameForInfer)
  const packaging = inferPackaging(nameForInfer)
  const acidity = extractAcidity(rawDescription) ?? extractAcidity(shortDesc)
  const polyphenols = extractPolyphenols(rawDescription) ?? extractPolyphenols(shortDesc)
  const slug = name ? slugify(name) : null

  return {
    url,
    domain,
    name,
    ean,
    brand,
    slug,
    type,
    originCountry: origin.country,
    originRegion: origin.region,
    volumeMl,
    packaging,
    acidity,
    polyphenols,
    price,
    currency: currency ?? 'CZK',
    inStock: null,
    imageUrl,
    descriptionShort: shortDesc,
    rawDescription,
  }
}
