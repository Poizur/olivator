// Product page scraper.
// Extracts structured data from e-commerce product pages using:
//   1. JSON-LD (Schema.org Product) — most reliable when present
//   2. OpenGraph meta tags (og:title, og:image, og:description)
//   3. Per-domain CSS selector fallbacks (reckonasbavi, Shoptet, WooCommerce)
//
// Returns a best-effort ScrapedProduct. Missing fields are null/undefined.

import * as cheerio from 'cheerio'
import { extractBrand } from './utils'

export interface ScrapedImage {
  url: string
  alt: string | null
}

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
  peroxideValue: number | null

  // Commerce
  price: number | null
  currency: string | null
  inStock: boolean | null

  // Media
  imageUrl: string | null       // primary image (backwards compat)
  galleryImages: ScrapedImage[] // all product images (primary + gallery)

  // Lab analysis (some shops publish on product page without a lab report image)
  k232: number | null
  k270: number | null
  deltaK: number | null
  waxMaxMgPerKg: number | null  // Vosk (≤ X mg/kg)
  oleicAcidPct: number | null   // some shops list it as parameter

  // Content
  descriptionShort: string | null
  rawDescription: string | null // full scraped text, for AI rewrite

  // Generic catch-all: every key:value row from "Parametry produktu" tables.
  // Allows admin to inspect what scraper saw and add new mappings later.
  parameterTable: Record<string, string>
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
  // Patterns to handle (in order of specificity):
  //   "acidita: 0,3%"             → 0.3
  //   "kyselost 0.2 %"            → 0.2
  //   "Acidita: max. ≤ 0,39%"    → 0.39 (upper bound, conservative)
  //   "Acidita: ≤ 0,5%"           → 0.5
  //   "Acidita: < 0,3%"           → 0.3
  //   "Acidita: do 0,5%"          → 0.5
  //   "Acidita: 0,32 - 0,8%"      → 0.32 (range, take low = naměřená)
  //   "Acidita 0,32-0,8%"          → 0.32
  const re = /(?:acidita|kyselost|acidity)[:\s]*(?:max\.?\s*)?(?:[≤<]\s*|do\s+)?(\d+[,.]?\d*)\s*(?:%|\s*-\s*\d+[,.]?\d*\s*%)/i
  const m = text.match(re)
  if (!m) return null
  return parseFloat(m[1].replace(',', '.'))
}

// Words inside the polyphenol match that signal it's a regulatory/typical/EU
// threshold reference, not a fact about THIS product. Reject those matches.
const POLYPHENOL_THRESHOLD_MARKERS = [
  'minimáln', 'alespoň', 'musí mí', 'musí být', 'vyžaduje', 'norma',
  'typicky', 'obvykl', 'běžn', 'standardn', 'kategori',
]

export function extractPolyphenols(text: string | null): number | null {
  if (!text) return null
  // JS regex `\w` doesn't match unicode letters like ů/é — so `polyfenol\w*`
  // wouldn't capture "polyfenolů". Use `[^\s\d:]*` instead so diacritics
  // between the keyword and the number don't break the match.
  // Czech word order — number BEFORE keyword: "2012 mg/kg polyfenolů", "600+ polyfenolů".
  // English/declined Czech — number AFTER keyword: "polyphenols: 250", "polyfenolů 623 mg/kg",
  // "polyfenolů dosahuje 646 mg/kg" (allow short verb between).
  const m =
    text.match(/(\d{2,5})\s*\+?\s*mg\s*\/\s*kg\s*polyfenol/i) ||
    text.match(/(\d{2,5})\s*\+?\s*polyfenol/i) ||
    text.match(/polyfenol[^\s\d:]*[:\s]*(\d{2,5})/i) ||
    text.match(/polyphenol[^\s\d:]*[:\s]*(\d{2,5})/i) ||
    // Fallback: keyword + a short verb/preposition + number followed by mg.
    // Sentence boundary protected via [^.!?] — won't bleed across sentences.
    text.match(/polyfenol[^.!?]{0,30}?(\d{2,5})\s*\+?\s*mg/i) ||
    text.match(/polyphenol[^.!?]{0,30}?(\d{2,5})\s*\+?\s*mg/i)
  if (!m) return null

  // Reject matches that contain threshold/reference language between keyword
  // and number — e.g. "polyfenolů minimálně 250 mg/kg" is the EU norm value,
  // not the product's actual polyphenol count.
  const matchedSpan = m[0].toLowerCase()
  if (POLYPHENOL_THRESHOLD_MARKERS.some((w) => matchedSpan.includes(w))) {
    return null
  }

  const n = parseInt(m[1], 10)
  // Sanity: realistic range 50–3000 mg/kg. Below 50 likely a different number.
  if (n < 50 || n > 3000) return null
  return n
}

/** Extract peroxide value — "peroxidové číslo: ≤ 20 mEq" / "peroxid 8,5 mEq/kg". */
function extractPeroxide(text: string | null): number | null {
  if (!text) return null
  const m = text.match(/peroxid(?:ov[ée]? číslo)?[:\s]*(?:≤|<=?|max)?\s*(\d+[.,]?\d*)\s*m?Eq/i)
  if (!m) return null
  return parseFloat(m[1].replace(',', '.'))
}

/** Parse a number from a string that may contain prefixes (≤, <, max), suffix
 *  units, comma decimals, and ranges ("0,49% až ≤ 0,8%"). Returns the FIRST
 *  number found (for ranges, that's the lower bound, which is the actual value). */
function parseValueWithPrefix(s: string): number | null {
  if (!s) return null
  const m = s.match(/(\d+[.,]?\d*)/)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return isFinite(n) ? n : null
}

/** Generic parser for "Parametry produktu" tables — handles the common
 *  <table><tr><th>label</th><td>value</td></tr></table> pattern used by
 *  Shoptet, WooCommerce, and most Czech e-shops. Returns key:value map
 *  with HTML stripped from values. */
function extractParameterTable($: cheerio.CheerioAPI): Record<string, string> {
  const out: Record<string, string> = {}
  // <th>label</th><td>value</td> rows
  $('tr').each((_, el) => {
    const $tr = $(el)
    const label = $tr.find('th').first().text().trim().replace(/[:：]\s*$/, '')
    const value = $tr.find('td').first().text().trim()
    if (label && value && label.length < 60 && value.length < 200) {
      // Skip rows that look like UI navigation, not data
      if (/přidat|košík|cart|wishlist|oblíbené/i.test(label)) return
      out[label] = value
    }
  })
  // Also <dl><dt>label</dt><dd>value</dd></dl>
  $('dl').each((_, el) => {
    const $dl = $(el)
    const dts = $dl.find('dt').toArray()
    const dds = $dl.find('dd').toArray()
    for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
      const label = $(dts[i]).text().trim().replace(/[:：]\s*$/, '')
      const value = $(dds[i]).text().trim()
      if (label && value && !out[label]) out[label] = value
    }
  })
  return out
}

/** Map textové hořkosti na 0-100 score pro flavor_profile.bitter.
 *  Reckonasbavi používá fixní set: Jemný / Středně hořký / Výrazný / Pálivý. */
function mapBitterness(text: string | null): number | null {
  if (!text) return null
  const t = text.toLowerCase()
  if (/jemn[ýá]/.test(t)) return 25       // Jemný = nízká hořkost
  if (/středn[ěí]/.test(t)) return 50    // Středně hořký
  if (/výrazn[ýá]/.test(t)) return 75    // Výrazný = vysoká
  if (/pálivý|štiplavý/.test(t)) return 80 // Pálivý překračuje hořkost
  if (/hořk[ýá]/.test(t)) return 70       // Generic "hořký"
  return null
}

/** Map known parameter table keys to structured fields. Returns partial
 *  ScrapedProduct. Keys are matched case-insensitive on label prefix. */
function mapParameterTableToFields(table: Record<string, string>): {
  k232: number | null
  k270: number | null
  deltaK: number | null
  waxMaxMgPerKg: number | null
  oleicAcidPct: number | null
  acidityFromTable: number | null
  peroxideFromTable: number | null
  packagingFromTable: string | null
  bitternessFromTable: number | null
} {
  // Helper: find first table key that includes any of `needles` (lowercase, normalized)
  const findKey = (...needles: string[]): string | null => {
    for (const [k, _v] of Object.entries(table)) {
      const norm = k.toLowerCase().replace(/[:.]/g, '').trim()
      if (needles.some((n) => norm.includes(n))) return k
    }
    return null
  }
  const valueOf = (...needles: string[]): string | null => {
    const k = findKey(...needles)
    return k ? table[k] : null
  }

  // K232 / K270 / DK — small decimals
  const k232 = parseValueWithPrefix(valueOf('k232') ?? '')
  const k270 = parseValueWithPrefix(valueOf('k270') ?? '')
  const deltaKRaw = valueOf('dk', 'delta k', 'δk')
  const deltaK = parseValueWithPrefix(deltaKRaw ?? '')
  // Vosk (≤ 150 mg/kg) — wax content
  const waxMaxMgPerKg = parseValueWithPrefix(valueOf('vosk') ?? '')
  // Oleic acid
  const oleicAcidPct = parseValueWithPrefix(
    valueOf('kyselina olejov', 'olejová kyselina', 'oleic') ?? ''
  )
  // Acidity from table (range "0,49% až ≤ 0,8%" → take 0,49)
  const acidityFromTable = parseValueWithPrefix(valueOf('acidita', 'kyselost') ?? '')
  // Peroxide
  const peroxideFromTable = parseValueWithPrefix(
    valueOf('peroxidov', 'peroxid') ?? ''
  )
  // Packaging
  const packagingRaw = (valueOf('druh obalu', 'obal') ?? '').toLowerCase()
  let packagingFromTable: string | null = null
  if (/plech/.test(packagingRaw)) packagingFromTable = 'tin'
  else if (/sklo|glass/.test(packagingRaw)) packagingFromTable = 'dark_glass'
  else if (/pet|plast/.test(packagingRaw)) packagingFromTable = 'pet'
  else if (/keramik/.test(packagingRaw)) packagingFromTable = 'ceramic'

  // Bitterness — 'Hořkost' label v Shoptet shopech
  const bitternessFromTable = mapBitterness(valueOf('hořkost', 'horkost'))

  return {
    k232,
    k270,
    deltaK,
    waxMaxMgPerKg,
    oleicAcidPct,
    acidityFromTable,
    peroxideFromTable,
    packagingFromTable,
    bitternessFromTable,
  }
}

/** Resolve a possibly-relative URL against a base. */
function resolveUrl(href: string, base: string): string | null {
  if (!href) return null
  if (/^data:/.test(href)) return null
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

/** Upgrade Shoptet thumbnail URL to full-size by dropping "_small" suffix. */
function upgradeShoptetImage(url: string): string {
  return url.replace(/_small\.(jpe?g|png|webp)(\?|$)/i, '.$1$2')
}

/** Dedupe by URL, keep first occurrence (preserves order). */
function dedupeImages(images: ScrapedImage[]): ScrapedImage[] {
  const seen = new Set<string>()
  const out: ScrapedImage[] = []
  for (const img of images) {
    if (seen.has(img.url)) continue
    seen.add(img.url)
    out.push(img)
  }
  return out
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
  // 1. JSON-LD product schema
  if (product) {
    const candidates = [product.gtin13, product.gtin, product.sku, product.mpn]
    for (const c of candidates) {
      if (typeof c === 'string' && /^\d{8,14}$/.test(c.trim())) {
        ean = c.trim()
        break
      }
    }
  }
  // 2. Schema.org microdata: <meta itemprop="gtin13" content="..."> / itemprop="gtin"
  if (!ean) {
    const microdataKeys = ['gtin13', 'gtin12', 'gtin', 'gtin14', 'gtin8', 'productID']
    for (const key of microdataKeys) {
      const val = $(`[itemprop="${key}"]`).first().attr('content') ?? $(`[itemprop="${key}"]`).first().text()
      if (val && /^\d{8,14}$/.test(val.trim())) {
        ean = val.trim()
        break
      }
    }
  }
  // 3. Common shop class names (Shoptet's productEan, generic .ean, [data-ean])
  if (!ean) {
    const classCandidates = [
      $('.productEan__value').first().text(),
      $('.product-ean').first().text(),
      $('[data-ean]').first().attr('data-ean'),
      $('[data-gtin]').first().attr('data-gtin'),
    ]
    for (const c of classCandidates) {
      if (c && /^\d{8,14}$/.test(c.trim())) {
        ean = c.trim()
        break
      }
    }
  }
  // 4. Fallback regex on page text — tolerates HTML elements between keyword and number
  if (!ean) {
    const pageText = $('body').text().slice(0, 30_000)
    // Up to 100 chars between keyword and number for HTML-cluttered tables
    const m =
      pageText.match(/EAN[\s:.\-]{0,5}(\d{8,14})/i) ||
      pageText.match(/GTIN[\s:.\-]{0,5}(\d{8,14})/i) ||
      pageText.match(/Čárový kód[\s:.\-]{0,5}(\d{8,14})/i)
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

  // --- images: primary + gallery ---
  const galleryImages: ScrapedImage[] = []

  // 1. JSON-LD primary image
  let primaryImage: string | null = null
  if (product?.image) {
    const img = Array.isArray(product.image) ? product.image[0] : product.image
    if (typeof img === 'string') primaryImage = img
    else if (typeof img === 'object' && img !== null) {
      primaryImage = (img as Record<string, unknown>).url as string | null
    }
  }
  primaryImage ||= cleanText($('meta[property="og:image"]').attr('content'))

  // 2. Shoptet main image (.p-image img)
  if (!primaryImage) {
    const mainImg = $('.p-image img').first().attr('src')
    if (mainImg) primaryImage = resolveUrl(mainImg, url)
  }

  if (primaryImage) {
    galleryImages.push({ url: primaryImage, alt: name })
  }

  // 3. Shoptet gallery (a[data-gallery] wraps full-size images)
  $('a[data-gallery]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const full = resolveUrl(href, url)
    if (full) galleryImages.push({ url: full, alt: cleanText($(el).find('img').attr('alt')) })
  })

  // 4. Generic gallery selectors (fallback for other platforms)
  const genericGallerySels = [
    '.product-gallery img',
    '.gallery img',
    '.image-gallery img',
    '.swiper-slide img',
  ]
  for (const sel of genericGallerySels) {
    $(sel).each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src')
      if (!src || /^data:/.test(src)) return
      const full = resolveUrl(src, url)
      if (full) galleryImages.push({ url: full, alt: cleanText($(el).attr('alt')) })
    })
  }

  // Shoptet thumbnails: upgrade _small to full size
  for (const img of galleryImages) {
    img.url = upgradeShoptetImage(img.url)
  }
  const dedupedGallery = dedupeImages(galleryImages)
  const imageUrl = dedupedGallery[0]?.url ?? null

  // --- description ---
  const shortDesc =
    cleanText($('.p-short-description').text()) ||
    cleanText(product?.description as string | undefined) ||
    cleanText($('meta[property="og:description"]').attr('content')) ||
    cleanText($('meta[name="description"]').attr('content'))

  // Long description — Shoptet uses #description, fallback to common platforms
  const longDescSelectors = [
    '#description',                  // Shoptet
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
      if (rawDescription && rawDescription.length > 100) break
    }
  }
  if (!rawDescription) rawDescription = shortDesc

  // Shoptet parameters table — extract EAN, packaging, peroxide, bitterness
  // Table rows are in .product-parameters or free-text tables; fall back to full body search
  const paramsText = cleanText(
    $('.product-parameters').text() ||
    $('.p-full-description table').text() ||
    $('table').text()
  ) ?? ''

  // --- inferred fields ---
  const allText = [name, shortDesc, rawDescription, paramsText].filter(Boolean).join(' ')
  const type = inferType(allText)
  const origin = inferOrigin(allText)
  const volumeMl = inferVolumeMl(allText)
  const inferredPackaging = inferPackaging(allText)
  const acidity = extractAcidity(rawDescription) ?? extractAcidity(shortDesc) ?? extractAcidity(paramsText)
  const polyphenols = extractPolyphenols(rawDescription) ?? extractPolyphenols(shortDesc) ?? extractPolyphenols(paramsText)
  const peroxideText = extractPeroxide(rawDescription) ?? extractPeroxide(paramsText)
  const slug = name ? slugify(name) : null

  // Generic parameter table — extracts ALL key:value rows so admin sees everything
  // the page exposed. Mapper picks known structured fields; rest stays in
  // parameterTable map for extracted_facts pipeline.
  const parameterTable = extractParameterTable($)
  const tableFields = mapParameterTableToFields(parameterTable)

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
    packaging: tableFields.packagingFromTable ?? inferredPackaging,
    // Prefer text-derived values (more accurate than table ranges) but fall back to table.
    acidity: acidity ?? tableFields.acidityFromTable,
    polyphenols,
    peroxideValue: peroxideText ?? tableFields.peroxideFromTable,
    k232: tableFields.k232,
    k270: tableFields.k270,
    deltaK: tableFields.deltaK,
    waxMaxMgPerKg: tableFields.waxMaxMgPerKg,
    oleicAcidPct: tableFields.oleicAcidPct,
    price,
    currency: currency ?? 'CZK',
    inStock: null,
    imageUrl,
    galleryImages: dedupedGallery,
    descriptionShort: shortDesc,
    rawDescription,
    parameterTable,
  }
}
