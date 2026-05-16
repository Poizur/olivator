// Product page scraper.
// Extracts structured data from e-commerce product pages using:
//   1. JSON-LD (Schema.org Product) — most reliable when present
//   2. OpenGraph meta tags (og:title, og:image, og:description)
//   3. Per-domain CSS selector fallbacks (reckonasbavi, Shoptet, WooCommerce)
//
// Returns a best-effort ScrapedProduct. Missing fields are null/undefined.

import * as cheerio from 'cheerio'
import { extractBrand, inferOriginFromText } from './utils'

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
  oleocanthal: number | null    // mg/kg — often in parameter tables
  harvestYear: number | null    // year of harvest
  processing: string | null     // cold_pressed | filtered | unfiltered | early_harvest

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

const inferOrigin = inferOriginFromText

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

export function extractAcidity(text: string | null): number | null {
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
export function extractHarvestYear(text: string | null): number | null {
  if (!text) return null
  const patterns = [
    /sklize[nň][ěe]?\s*:?\s*(20\d{2})/i,
    /ro[čc]n[íi]k\s*:?\s*(20\d{2})/i,
    /harvest\s+(?:year\s*:?\s*)?(20\d{2})/i,
    /\b(20\d{2})\s*\/\s*\d{2}\b/,           // "2024/25"
    /\b(20\d{2})\s*sklize[nň]/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) return parseInt(m[1])
  }
  return null
}

export function extractProcessing(text: string | null): string | null {
  if (!text) return null
  const t = text.toLowerCase()
  if (/za\s+studena\s+lis|cold.?press/.test(t)) return 'cold_pressed'
  if (/nefiltr/.test(t)) return 'unfiltered'
  if (/filtr[ao]/.test(t)) return 'filtered'
  if (/early\s+harvest|rann[áa]\s+sklize/.test(t)) return 'early_harvest'
  return null
}

export function extractOleocanthal(text: string | null): number | null {
  if (!text) return null
  const m =
    text.match(/(\d{1,4})\s*\+?\s*mg\s*\/\s*kg\s*oleokantal/i) ||
    text.match(/(\d{1,4})\s*\+?\s*oleokantal/i) ||
    text.match(/oleokantal[^\s\d:]*[:\s]*(\d{1,4})/i) ||
    text.match(/oleocanthal[^\s\d:]*[:\s]*(\d{1,4})/i)
  if (!m) return null
  const v = parseFloat(m[1])
  return v > 0 && v < 2000 ? v : null
}

const NON_OLIVE_KEYWORDS = /ostropestř|milk\s+thistle|silymarin|lněn|kokos|konopn|dýňov|slunečnic|řepkov|kondicionér|šampon|vlasov/iu

/** Vrátí true pokud je produkt olivový olej — rejectne milk thistle, kokosový olej atd. */
export function validateOliveOilProduct(name: string): boolean {
  return !NON_OLIVE_KEYWORDS.test(name)
}

const POLYPHENOL_THRESHOLD_MARKERS = [
  'minimáln', 'alespoň', 'musí mí', 'musí být', 'vyžaduje', 'norma',
  'typicky', 'obvykl', 'běžn', 'standardn', 'kategori',
]

// Words that signal the number belongs to a different product being compared,
// not to the product being scraped. Checked in the 200 chars before the match.
const COMPARATIVE_MARKERS = [
  'např.', 'například', 'jako třeba', 'jako ', 'srovnání', 've srovnání s',
  'vs.', ' vs ', 'versus', 'běžný', 'průměrný',
  'jiné oleje', 'ostatní oleje', 'obsahuje přibližně',
]

export function extractPolyphenols(text: string | null): number | null {
  if (!text) return null
  // JS regex `\w` doesn't match unicode letters like ů/é — so `polyfenol\w*`
  // wouldn't capture "polyfenolů". Use `[^\s\d:]*` instead so diacritics
  // between the keyword and the number don't break the match.
  // Czech word order — number BEFORE keyword: "2012 mg/kg polyfenolů", "600+ polyfenolů".
  // English/declined Czech — number AFTER keyword: "polyphenols: 250", "polyfenolů 623 mg/kg",
  // "polyfenolů dosahuje 646 mg/kg" (allow short verb between).
  //
  // Loop: if a match is in comparative context (see COMPARATIVE_MARKERS), skip it
  // and retry from after the match. Fixes "SITIA má 479mg/kg … EVOLIA je výš 2777".
  let remaining = text
  while (remaining.length > 0) {
    // NUM = 2-5 digit number OR "2 777" / "1 200" style (space as thousands sep, incl. NBSP)
    const NUM = '(\\d{1,2}[\\s\\u00A0]\\d{3}|\\d{2,5})'
    const m =
      remaining.match(new RegExp(`${NUM}\\s*\\+?\\s*mg\\s*\\/\\s*kg\\s*polyfenol`, 'i')) ||
      remaining.match(new RegExp(`${NUM}\\s*\\+?\\s*polyfenol`, 'i')) ||
      remaining.match(new RegExp(`polyfenol[^\\s\\d:]*[:\\s]*${NUM}`, 'i')) ||
      remaining.match(new RegExp(`polyphenol[^\\s\\d:]*[:\\s]*${NUM}`, 'i')) ||
      // Fallback: keyword + a short verb/preposition + number followed by mg.
      // Sentence boundary protected via [^.!?] — won't bleed across sentences.
      remaining.match(new RegExp(`polyfenol[^.!?]{0,30}?${NUM}\\s*\\+?\\s*mg`, 'i')) ||
      remaining.match(new RegExp(`polyphenol[^.!?]{0,30}?${NUM}\\s*\\+?\\s*mg`, 'i'))
    if (!m) return null

    const matchIdx = remaining.indexOf(m[0])
    const before = remaining.slice(Math.max(0, matchIdx - 200), matchIdx).toLowerCase()

    // Skip if comparative context detected before the match.
    if (COMPARATIVE_MARKERS.some((w) => before.includes(w))) {
      remaining = remaining.slice(matchIdx + m[0].length)
      continue
    }

    // Reject matches that contain threshold/reference language between keyword
    // and number — e.g. "polyfenolů minimálně 250 mg/kg" is the EU norm value,
    // not the product's actual polyphenol count.
    const matchedSpan = m[0].toLowerCase()
    if (POLYPHENOL_THRESHOLD_MARKERS.some((w) => matchedSpan.includes(w))) {
      remaining = remaining.slice(matchIdx + m[0].length)
      continue
    }

    const n = parseInt(m[1].replace(/[\s ]/g, ''), 10)
    // Sanity: realistic range 50–3000 mg/kg. Below 50 likely a different number.
    if (n < 50 || n > 3000) {
      remaining = remaining.slice(matchIdx + m[0].length)
      continue
    }
    return n
  }
  return null
}

/** Extract peroxide value — "peroxidové číslo: ≤ 20 mEq" / "peroxid 8,5 mEq/kg".
 *  Hodnoty ≥ 20 jsou artefakt scraping EU limitu ("≤ 20 mEq/kg") — ignorujeme je. */
function extractPeroxide(text: string | null): number | null {
  if (!text) return null
  const m = text.match(/peroxid(?:ov[ée]? číslo)?[:\s]*(?:≤|<=?|max)?\s*(\d+[.,]?\d*)\s*m?Eq/i)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 20 ? n : null
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
  oleocanthalFromTable: number | null
  harvestYearFromTable: number | null
  processingFromTable: string | null
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

  // Oleocanthal (mg/kg)
  const oleocanthalFromTable = parseValueWithPrefix(
    valueOf('oleokantal', 'oleocanthal', 'oleokanthal') ?? ''
  )

  // Harvest year — "Rok sklizně", "Sklizeň", "Ročník", "Vintage"
  const harvestYearRaw = valueOf('rok sklizně', 'sklizeň', 'harvest year', 'vintage', 'ročník', 'harvest')
  let harvestYearFromTable: number | null = null
  if (harvestYearRaw) {
    const m = harvestYearRaw.match(/\b(20\d{2})\b/)
    if (m) harvestYearFromTable = parseInt(m[1])
  }

  // Processing — "Způsob výroby", "Zpracování", "Processing", "Lisování"
  const processingRaw = (valueOf('způsob výroby', 'zpracování', 'processing', 'výroba', 'lisování') ?? '').toLowerCase()
  let processingFromTable: string | null = null
  if (/studena|cold.?press/.test(processingRaw)) processingFromTable = 'cold_pressed'
  else if (/nefiltr/.test(processingRaw)) processingFromTable = 'unfiltered'
  else if (/filtr/.test(processingRaw)) processingFromTable = 'filtered'
  else if (/early|rann/.test(processingRaw)) processingFromTable = 'early_harvest'

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
    oleocanthalFromTable,
    harvestYearFromTable,
    processingFromTable,
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

/**
 * SSRF guard — odmítá URL, které by skraper mohl použít k oslovení interních
 * služeb (cloud metadata service, lokální DB, internal mikroservices).
 * Blokuje:
 * - non-http(s) schémata (file:, ftp:, gopher:, ...)
 * - hostname ve formě IP adresy v privátních / loopback / link-local rozsazích
 * - hostname v internal TLD (.local, .internal, .arpa)
 *
 * Pozn: defense-in-depth. Pokud by hostname rezolvoval na privátní IP teprve
 * při DNS lookupu, fetch by tam šel — ale to by chtělo dotaz na DNS přímo.
 * Tady chytíme alespoň literal IP.
 */
function isPublicUrl(rawUrl: string): { ok: true } | { ok: false; reason: string } {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'malformed URL' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: `bad protocol ${parsed.protocol}` }
  }
  const host = parsed.hostname.toLowerCase()
  // Internal TLDs
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.arpa')) {
    return { ok: false, reason: `internal hostname ${host}` }
  }
  // Literal IPv4
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number)
    // 10.0.0.0/8
    if (a === 10) return { ok: false, reason: 'private IPv4 (10.x)' }
    // 127.0.0.0/8 (loopback)
    if (a === 127) return { ok: false, reason: 'loopback IPv4' }
    // 169.254.0.0/16 (link-local + AWS metadata 169.254.169.254)
    if (a === 169 && b === 254) return { ok: false, reason: 'link-local IPv4' }
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return { ok: false, reason: 'private IPv4 (172.16-31)' }
    // 192.168.0.0/16
    if (a === 192 && b === 168) return { ok: false, reason: 'private IPv4 (192.168)' }
    // 0.0.0.0/8 a 100.64.0.0/10 (CGNAT)
    if (a === 0) return { ok: false, reason: '0.x IPv4' }
    if (a === 100 && b >= 64 && b <= 127) return { ok: false, reason: 'CGNAT IPv4' }
  }
  // IPv6 loopback / link-local — basic check
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) {
    return { ok: false, reason: 'private/loopback IPv6' }
  }
  return { ok: true }
}

// ── Charset-aware HTML decoder ────────────────────────────────────────────────
// Node fetch().text() defaults to UTF-8 when the HTTP Content-Type header
// omits a charset (common on Czech e-shops like zdrave-oleje.cz which serve
// Windows-1250 without declaring it in headers). Fix: read raw bytes, sniff
// charset from HTTP header first, then <meta charset> in the HTML, fallback UTF-8.

function extractMimeCharset(text: string): string | null {
  const m = text.match(/charset\s*=\s*"?([^\s;"'>]+)/i)
  return m ? m[1].toLowerCase().trim() : null
}

async function decodeHtmlBuffer(res: Response, contentType: string): Promise<string> {
  const rawBytes = await res.arrayBuffer()

  // 1. HTTP Content-Type header charset (most authoritative)
  const headerCharset = extractMimeCharset(contentType)
  if (headerCharset && headerCharset !== 'utf-8') {
    try { return new TextDecoder(headerCharset).decode(rawBytes) } catch { /* unsupported */ }
  }

  // 2. Sniff first 2 KB of the HTML for <meta charset> / <meta http-equiv>
  // Decode with latin1 (1:1 byte→char) so ASCII meta tags are always readable.
  const sniff = new TextDecoder('latin1').decode(rawBytes.slice(0, 2048))
  const metaCharset = extractMimeCharset(sniff)
  if (metaCharset && metaCharset !== 'utf-8') {
    try { return new TextDecoder(metaCharset).decode(rawBytes) } catch { /* unsupported */ }
  }

  // 3. Default to UTF-8
  return new TextDecoder('utf-8').decode(rawBytes)
}

/** Main entrypoint. Fetches the URL and extracts as much as possible. */
export async function scrapeProductPage(url: string): Promise<ScrapedProduct> {
  const guard = isPublicUrl(url)
  if (!guard.ok) {
    throw new Error(`SSRF guard: ${guard.reason}`)
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Olivator/1.0; +https://olivator.cz)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`)
  // Content-Type check — odmítáme binární přílohy / PDF / images, čekáme HTML
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('text/') && !contentType.includes('html')) {
    throw new Error(`Bad Content-Type: ${contentType}`)
  }
  // Velikostní strop — chrání před HTML bombou (100+ MB)
  const contentLength = Number(res.headers.get('content-length') ?? '0')
  if (contentLength > 5 * 1024 * 1024) {
    throw new Error(`Response too large: ${contentLength} B`)
  }
  const html = await decodeHtmlBuffer(res, contentType)
  if (html.length > 5 * 1024 * 1024) {
    throw new Error(`Response body too large: ${html.length} B`)
  }
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
  // Volume: prioritize product name (most reliable), fall back to rest of text.
  // Prevents description/params "500 ml" overriding a "100 ml" in the product title.
  const volumeMl = (name ? inferVolumeMl(name) : null) ?? inferVolumeMl([shortDesc, rawDescription, paramsText].filter(Boolean).join(' '))
  const inferredPackaging = inferPackaging(allText)
  const acidity = extractAcidity(rawDescription) ?? extractAcidity(shortDesc) ?? extractAcidity(paramsText)
  const polyphenols = extractPolyphenols(rawDescription) ?? extractPolyphenols(shortDesc) ?? extractPolyphenols(paramsText)
  const oleocanthal = extractOleocanthal(rawDescription) ?? extractOleocanthal(shortDesc) ?? extractOleocanthal(paramsText)
  const harvestYear = extractHarvestYear(rawDescription) ?? extractHarvestYear(shortDesc) ?? extractHarvestYear(name)
  const processing = extractProcessing(rawDescription) ?? extractProcessing(shortDesc)
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
    acidity: acidity ?? tableFields.acidityFromTable,
    polyphenols,
    oleocanthal: oleocanthal ?? tableFields.oleocanthalFromTable,
    harvestYear: harvestYear ?? tableFields.harvestYearFromTable,
    processing: processing ?? tableFields.processingFromTable,
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
