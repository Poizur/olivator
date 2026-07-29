/**
 * Web-price-checker — Playwright ověření dostupnosti a ceny nabídek.
 *
 * Denně projde všechny in_stock nabídky, porovná se stránkou partnera:
 *   - Nedostupné (vyprodáno fráze) → in_stock=false HNED (self-healing)
 *   - Cenový rozdíl >5 % → page_price uložen, price_mismatch=true
 *
 * manual_override=true: self-healing se NEpoužije (lidská oprava zůstane),
 * ale page_price + price_mismatch se stále aktualizují pro monitoring.
 */

import { chromium, type Page, type Browser } from 'playwright-core'
import { supabaseAdmin } from './supabase'
import { logAgentAction } from './audit-log'

const PRICE_MISMATCH_THRESHOLD = 0.05  // 5 %
const PAGE_LOAD_TIMEOUT_MS = 20_000
const CONCURRENCY = 2                  // 2 paralelní stránky

const UNAVAILABLE_PATTERNS = [
  'vyprodáno', 'vyprodano',
  'nedostupné', 'nedostupne',
  'není skladem', 'neni skladem',
  'out of stock', 'sold out',
  'momentálně nedostupné', 'momentalne nedostupne',
  'není k dispozici', 'neni k dispozici',
  'dočasně nedostupné', 'docasne nedostupne',
  'zboží není dostupné', 'zbozi neni dostupne',
  'nelze objednat', 'nelze přidat',
]

export interface OfferCheckDetail {
  offerId: string
  productSlug: string
  retailerSlug: string
  productUrl: string
  feedPrice: number
  pagePrice: number | null
  available: boolean
  priceMismatch: boolean
  reason: string
  manualOverride: boolean
}

export interface WebCheckResult {
  totalChecked: number
  availabilityFixed: number   // offers přepnuty na in_stock=false
  priceMismatches: number     // price_mismatch=true nově zaznamenáno
  errors: number
  skipped: number             // URL chybí nebo skip
  reportLine: string          // řádek do denního briefu
  details: OfferCheckDetail[]
}

/** Extrahuje cenu ze stránky. Vrací null pokud nenalezena. */
async function extractPagePrice(page: Page, feedPrice: number): Promise<number | null> {
  // 1. JSON-LD structured data (nejspolehlivější)
  try {
    const ldPrices = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      const found: number[] = []
      for (const s of scripts) {
        try {
          const extract = (obj: unknown): void => {
            if (!obj || typeof obj !== 'object') return
            const o = obj as Record<string, unknown>
            if (typeof o.price === 'number' && (o.price as number) > 0) found.push(o.price as number)
            if (typeof o.price === 'string' && Number(o.price) > 0) found.push(Number(o.price))
            if (o.offers) extract(Array.isArray(o.offers) ? (o.offers as unknown[])[0] : o.offers)
            if (Array.isArray(obj)) (obj as unknown[]).forEach(extract)
          }
          extract(JSON.parse(s.textContent || ''))
        } catch { /* ignore */ }
      }
      return found
    })
    const inRange = ldPrices.filter(p => p > 10 && p < 100_000)
    if (inRange.length > 0) {
      return inRange.sort((a, b) => Math.abs(a - feedPrice) - Math.abs(b - feedPrice))[0]
    }
  } catch { /* ignore */ }

  // 2. Open Graph / product meta
  try {
    const metaPrice = await page.evaluate(() => {
      const sel = 'meta[property="product:price:amount"], meta[property="og:price:amount"], meta[itemprop="price"]'
      return document.querySelector(sel)?.getAttribute('content') ?? null
    })
    if (metaPrice) {
      const p = parseFloat(metaPrice.replace(',', '.').replace(/\s/g, ''))
      if (p > 10 && p < 100_000) return p
    }
  } catch { /* ignore */ }

  // 3. Regex na viditelném textu
  try {
    const text = await page.evaluate(() => document.body.innerText)
    const PRICE_RE = /(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:Kč|CZK|korun[ay]?)/gi
    const candidates: number[] = []
    let m: RegExpExecArray | null
    while ((m = PRICE_RE.exec(text)) !== null) {
      const raw = m[1].replace(/[\s ]/g, '').replace(',', '.')
      const val = parseFloat(raw)
      if (val > 10 && val < 100_000) candidates.push(val)
    }
    const inRange = candidates.filter(p => p > feedPrice * 0.3 && p < feedPrice * 3)
    if (inRange.length > 0) {
      return inRange.sort((a, b) => Math.abs(a - feedPrice) - Math.abs(b - feedPrice))[0]
    }
  } catch { /* ignore */ }

  return null
}

/** Ověří dostupnost stránky. Vrací false pokud nalezena nedostupná fráze. */
async function checkAvailability(page: Page): Promise<{ available: boolean; reason: string }> {
  try {
    const text = (await page.evaluate(() => document.body.innerText)).toLowerCase()
    for (const pattern of UNAVAILABLE_PATTERNS) {
      if (text.includes(pattern)) {
        const idx = text.indexOf(pattern)
        const snippet = text.slice(Math.max(0, idx - 20), idx + 40).replace(/\n/g, ' ').trim()
        return { available: false, reason: `"${pattern}" → "${snippet}"` }
      }
    }
    // Zkontroluj přítomnost buy tlačítka jako sekundární signál
    const hasBuy = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      return els.some(el => {
        const t = (el.textContent || '').toLowerCase()
        const v = ((el as HTMLInputElement).value || '').toLowerCase()
        return (t.includes('přidat') || t.includes('koupit') || t.includes('objednat') ||
                v.includes('přidat') || v.includes('koupit')) &&
               !(el as HTMLButtonElement).disabled
      })
    }).catch(() => false)
    return { available: hasBuy, reason: hasBuy ? 'buy button found' : 'no buy button, no unavailable text' }
  } catch (err) {
    return { available: false, reason: `eval error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

interface OfferRow {
  id: string
  product_id: string
  retailer_id: string
  price: number
  product_url: string
  in_stock: boolean
  manual_override: boolean
  products: { slug: string } | null
  retailers: { slug: string; name: string } | null
}

async function processOffer(
  page: Page,
  offer: OfferRow,
  delay: number,
): Promise<OfferCheckDetail> {
  const productSlug = offer.products?.slug ?? offer.product_id
  const retailerSlug = offer.retailers?.slug ?? offer.retailer_id
  const feedPrice = Number(offer.price)

  const detail: OfferCheckDetail = {
    offerId: offer.id,
    productSlug,
    retailerSlug,
    productUrl: offer.product_url,
    feedPrice,
    pagePrice: null,
    available: true,
    priceMismatch: false,
    reason: '',
    manualOverride: offer.manual_override,
  }

  try {
    const resp = await page.goto(offer.product_url, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    })
    if (!resp || !resp.ok()) {
      detail.available = false
      detail.reason = `HTTP ${resp?.status() ?? '?'}`
    } else {
      const avail = await checkAvailability(page)
      detail.available = avail.available
      detail.reason = avail.reason

      if (avail.available) {
        const pagePrice = await extractPagePrice(page, feedPrice)
        detail.pagePrice = pagePrice
        if (pagePrice !== null && Math.abs(pagePrice - feedPrice) / feedPrice > PRICE_MISMATCH_THRESHOLD) {
          detail.priceMismatch = true
        }
      }
    }
  } catch (err) {
    detail.available = false
    detail.reason = `error: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`
  }

  await new Promise(r => setTimeout(r, delay))
  return detail
}

async function applyResults(details: OfferCheckDetail[], now: string): Promise<{ fixed: number; priced: number }> {
  let fixed = 0
  let priced = 0

  for (const d of details) {
    const update: Record<string, unknown> = { last_web_check: now }

    if (!d.available && !d.manualOverride) {
      // Self-healing: dostupnost → in_stock=false
      update.in_stock = false
      fixed++
      void logAgentAction({
        agentName: 'web-price-checker',
        decisionType: 'offer_availability_fixed',
        payload: { offer_id: d.offerId, slug: d.productSlug, retailer: d.retailerSlug, reason: d.reason },
      })
    } else if (!d.available && d.manualOverride) {
      // Override platí — jen logujeme, nepřepisujeme
      console.log(`[web-check] manual_override platí, skip fix: ${d.productSlug}`)
    }

    if (d.pagePrice !== null) {
      update.page_price = d.pagePrice
      update.price_mismatch = d.priceMismatch
      if (d.priceMismatch) {
        priced++
        console.log(`[web-check] cenová neshoda ${d.productSlug}: feed=${d.feedPrice} Kč, stránka=${d.pagePrice} Kč (${((Math.abs(d.pagePrice - d.feedPrice) / d.feedPrice) * 100).toFixed(1)} %)`)
        void logAgentAction({
          agentName: 'web-price-checker',
          decisionType: 'offer_price_mismatch',
          payload: {
            offer_id: d.offerId, slug: d.productSlug, retailer: d.retailerSlug,
            feed_price: d.feedPrice, page_price: d.pagePrice,
          },
        })
      }
    }

    const { error } = await supabaseAdmin
      .from('product_offers')
      .update(update)
      .eq('id', d.offerId)
    if (error) console.error(`[web-check] update error ${d.offerId}: ${error.message}`)
  }

  return { fixed, priced }
}

export async function runWebCheck(): Promise<WebCheckResult> {
  const now = new Date().toISOString()

  // Načti všechny in_stock nabídky s URL
  const { data: offerRows, error } = await supabaseAdmin
    .from('product_offers')
    .select(`
      id, product_id, retailer_id, price, product_url, in_stock, manual_override,
      products!inner ( slug ),
      retailers ( slug, name )
    `)
    .eq('in_stock', true)
    .not('product_url', 'is', null)

  if (error) throw new Error(`[web-check] DB error: ${error.message}`)

  const offers = (offerRows ?? []) as unknown as OfferRow[]
  // Náhodné pořadí (partneři nevidí systematický vzor)
  const shuffled = [...offers].sort(() => Math.random() - 0.5)

  const result: WebCheckResult = {
    totalChecked: 0,
    availabilityFixed: 0,
    priceMismatches: 0,
    errors: 0,
    skipped: 0,
    reportLine: '',
    details: [],
  }

  console.log(`[web-check] start — ${shuffled.length} in_stock nabídek, concurrency=${CONCURRENCY}`)

  let browser: Browser | null = null
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
    })

    // Rozdělíme nabídky na CONCURRENCY skupin, každá má svou stránku
    const chunks: OfferRow[][] = Array.from({ length: CONCURRENCY }, () => [])
    shuffled.forEach((o, i) => chunks[i % CONCURRENCY].push(o))

    const chunkResults = await Promise.all(chunks.map(async (chunk, idx) => {
      const ctx = await browser!.newContext({
        userAgent: 'Mozilla/5.0 (compatible; OlivatorBot/1.0; +https://olivator.cz/bot)',
      })
      const page = await ctx.newPage()
      const details: OfferCheckDetail[] = []

      for (const offer of chunk) {
        // Delay 3–5 s randomizovaný
        const delay = 3_000 + Math.floor(Math.random() * 2_000)
        const detail = await processOffer(page, offer, delay)
        details.push(detail)
        const mark = detail.available ? '✓' : '✗'
        const priceInfo = detail.pagePrice != null
          ? ` | stránka=${detail.pagePrice} Kč${detail.priceMismatch ? ' ⚠' : ''}`
          : ''
        console.log(`[web-check][${idx}] ${mark} ${detail.productSlug} (${detail.feedPrice} Kč)${priceInfo} — ${detail.reason}`)
      }

      await page.close()
      await ctx.close()
      return details
    }))

    result.details = chunkResults.flat()
    result.totalChecked = result.details.length
    result.errors = result.details.filter(d => d.reason.startsWith('error:') || d.reason.startsWith('HTTP')).length

    const { fixed, priced } = await applyResults(result.details, now)
    result.availabilityFixed = fixed
    result.priceMismatches = priced

  } finally {
    await browser?.close()
  }

  result.reportLine = `Web-check ${new Date().toISOString().slice(0, 10)}: ověřeno ${result.totalChecked} nabídek | ${result.availabilityFixed} neshod dostupnosti (opraveno) | ${result.priceMismatches} cenových neshod | ${result.errors} chyb`
  console.log(`[web-check] ${result.reportLine}`)

  // Zápis do agent_decisions pro denní brief
  void logAgentAction({
    agentName: 'web-price-checker',
    decisionType: 'daily_report',
    payload: {
      total_checked: result.totalChecked,
      availability_fixed: result.availabilityFixed,
      price_mismatches: result.priceMismatches,
      errors: result.errors,
      report_line: result.reportLine,
    },
  })

  return result
}
