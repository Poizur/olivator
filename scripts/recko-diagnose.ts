/**
 * Reckonasbavi diagnostika v2 — bez --single-process, cílená detekce
 * npx tsx --env-file=.env.local scripts/recko-diagnose.ts
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const RETAILER_ID = '83525b89-23ec-4432-a38a-497839156aa8'
const OUT_DIR = '/tmp/recko-diag'
fs.mkdirSync(OUT_DIR, { recursive: true })

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    // Bez --single-process: stabilní pro lokální diagnostiku
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
}

async function makeCtx(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  })
}

interface PageResult {
  available: boolean | null
  method: string
  mainSectionText: string
  fullPageSnippet: string
  hasBuyButton: boolean
  httpStatus: number
  error?: string
}

async function checkPage(page: Page, url: string, screenshotPath?: string): Promise<PageResult> {
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 })
    const httpStatus = resp?.status() ?? 0

    if (!resp || !resp.ok()) {
      return { available: false, method: `HTTP ${httpStatus}`, mainSectionText: '', fullPageSnippet: '', hasBuyButton: false, httpStatus }
    }

    await page.waitForTimeout(1500)

    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: false })
    }

    // 1. Structured data — nejspolehlivější signál
    const domAvailability = await page.evaluate(() => {
      const avail = document.querySelector('[itemprop="availability"]')
      if (avail) return avail.getAttribute('content') ?? avail.textContent ?? ''
      const lds = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      for (const s of lds) {
        try {
          const d = JSON.parse(s.textContent || '') as Record<string, unknown>
          const dig = (o: Record<string, unknown>): string | null => {
            if (o?.availability) return String(o.availability)
            if (o?.offers) {
              const off = (Array.isArray(o.offers) ? o.offers[0] : o.offers) as Record<string, unknown>
              if (off?.availability) return String(off.availability)
            }
            return null
          }
          const r = dig(d)
          if (r) return r
        } catch { /* ignore */ }
      }
      return ''
    })

    // 2. Buy button stav
    const buyBtn = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], .btn-buy, [class*="buy-btn"], [class*="add-to-cart"]'))
      for (const el of candidates) {
        const t = (el.textContent || '').toLowerCase()
        const v = ((el as HTMLInputElement).value || '').toLowerCase()
        const isBuy = ['přidat', 'koupit', 'do košíku', 'vložit', 'objednat'].some(kw => t.includes(kw) || v.includes(kw))
        if (isBuy) {
          return { found: true, disabled: (el as HTMLButtonElement).disabled || el.getAttribute('disabled') !== null || el.getAttribute('aria-disabled') === 'true', text: (t || v).slice(0, 60) }
        }
      }
      return { found: false, disabled: false, text: '' }
    })

    // 3. Hlavní sekce produktu (ne celá stránka)
    const mainSection = await page.evaluate(() => {
      const sels = ['.product-detail__info', '.product-detail', '.product-info', '[class*="product-detail"]', 'main .product', '.entry-summary', 'form[action*="cart"]', 'main']
      for (const sel of sels) {
        const el = document.querySelector(sel)
        if (el && (el.textContent?.length ?? 0) > 50) return el.textContent?.slice(0, 2000) ?? ''
      }
      return ''
    })

    // Rozhodnutí — prioritní pořadí
    let available: boolean
    let method: string

    if (domAvailability) {
      const lo = domAvailability.toLowerCase()
      const isIn = lo.includes('instock') || lo.includes('in_stock')
      const isOut = lo.includes('outofstock') || lo.includes('out_of_stock') || lo.includes('discontinued')
      if (isIn || isOut) {
        available = isIn
        method = `LD+microdata: "${domAvailability.slice(0, 60)}"`
      } else {
        available = buyBtn.found && !buyBtn.disabled
        method = `buy-btn (LD ambiguous): found=${buyBtn.found} disabled=${buyBtn.disabled} "${buyBtn.text}"`
      }
    } else if (buyBtn.found) {
      available = !buyBtn.disabled
      method = `buy-btn: "${buyBtn.text}" disabled=${buyBtn.disabled}`
    } else {
      const mainLo = mainSection.toLowerCase()
      const UNAVAIL = ['vyprodáno', 'nedostupné', 'není skladem', 'out of stock', 'momentálně nedostupné']
      const hit = UNAVAIL.find(p => mainLo.includes(p))
      available = !hit
      method = hit ? `text-in-main: "${hit}"` : 'no-signal (assume avail)'
    }

    // Najdi výskyt "vyprodáno" kdekoliv na stránce pro referenci
    const fullText = await page.evaluate(() => document.body.innerText).catch(() => '')
    let fullPageSnippet = ''
    const FIND = ['vyprodáno', 'out of stock', 'nedostupné', 'není skladem']
    for (const p of FIND) {
      const idx = fullText.toLowerCase().indexOf(p)
      if (idx >= 0) {
        fullPageSnippet = fullText.slice(Math.max(0, idx - 50), idx + 100).replace(/\n+/g, ' ').trim()
        break
      }
    }

    return {
      available,
      method,
      mainSectionText: mainSection.slice(0, 300).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(),
      fullPageSnippet,
      hasBuyButton: buyBtn.found,
      httpStatus,
    }
  } catch (err) {
    return { available: null, method: 'error', mainSectionText: '', fullPageSnippet: '', hasBuyButton: false, httpStatus: 0, error: err instanceof Error ? err.message.slice(0, 120) : String(err) }
  }
}

interface CheckResult extends PageResult {
  slug: string; price: number; url: string; wasOverridden: boolean
}

async function main() {
  const { data: offers } = await sb
    .from('product_offers')
    .select('id, product_id, price, product_url, in_stock, manual_override, products!inner(slug)')
    .eq('retailer_id', RETAILER_ID)
    .not('product_url', 'is', null)

  const rows = (offers ?? []) as Array<{ id: string; product_id: string; price: number; product_url: string; in_stock: boolean; manual_override: boolean; products: { slug: string } }>
  const overridden = rows.filter(r => r.manual_override).sort(() => Math.random() - 0.5)
  const live = rows.filter(r => r.in_stock && !r.manual_override).sort(() => Math.random() - 0.5)
  const toCheck = [...overridden, ...live]

  console.log(`\n[diagnóza] ${rows.length} nabídek celkem | override=${overridden.length} live=${live.length}`)
  console.log(`[diagnóza] Kontroluji ${toCheck.length} URL (delay 4s)\n`)
  console.log('─'.repeat(100))

  let browser = await launchBrowser()
  let ctx = await makeCtx(browser)
  const results: CheckResult[] = []
  let screenshotCount = 0

  for (const offer of toCheck) {
    const slug = (offer.products as { slug: string }).slug
    const flag = offer.manual_override ? '[OVR] ' : '[LIVE] '
    const wantSS = screenshotCount < 3
    const ssPath = wantSS ? path.join(OUT_DIR, `ss-${screenshotCount + 1}-${slug.slice(0, 35)}.png`) : undefined

    let page: Page | null = null
    let r: PageResult
    try {
      page = await ctx.newPage()
      r = await checkPage(page, offer.product_url, ssPath)
      if (ssPath && r.available !== null && r.httpStatus > 0) screenshotCount++
    } catch (err) {
      // Browser/context crash — restart
      console.log(`[diagnóza] ⚠️ crash, restart browseru...`)
      try { await ctx.close() } catch { /* ignore */ }
      try { await browser.close() } catch { /* ignore */ }
      browser = await launchBrowser()
      ctx = await makeCtx(browser)
      r = { available: null, method: 'crash-restart', mainSectionText: '', fullPageSnippet: '', hasBuyButton: false, httpStatus: 0, error: String(err) }
    } finally {
      if (page && !page.isClosed()) await page.close().catch(() => {})
    }

    const mark = r.available === true ? '✓ OK      ' : r.available === false ? '✗ UNAVAIL ' : '? ERROR   '
    console.log(`${mark} ${flag} ${offer.price} Kč | ${slug}`)
    console.log(`           metoda: ${r.method}`)
    if (r.mainSectionText) console.log(`           main: "${r.mainSectionText.slice(0, 110)}"`)
    if (r.fullPageSnippet) console.log(`           full: "…${r.fullPageSnippet.slice(0, 110)}…"`)
    if (r.error) console.log(`           err: ${r.error}`)
    if (ssPath && screenshotCount > 0) console.log(`           📸 ${ssPath}`)

    results.push({ slug, price: Number(offer.price), url: offer.product_url, wasOverridden: offer.manual_override, ...r })
    await new Promise(res => setTimeout(res, 4_000))
  }

  await browser.close()

  const ok = results.filter(r => r.available === true)
  const unavail = results.filter(r => r.available === false)
  const errs = results.filter(r => r.available === null)
  const ovrResults = results.filter(r => r.wasOverridden)
  const falseOvr = ovrResults.filter(r => r.available === true)
  const big5 = results.filter(r => /(-5-?l)(-|$)/i.test(r.slug))
  const small = results.filter(r => !/(-5-?l)(-|$)/i.test(r.slug))

  console.log('\n' + '═'.repeat(100))
  console.log(`\n✅ Dostupné:   ${ok.length} / ${results.length} (${Math.round(ok.length/results.length*100)} %)`)
  console.log(`✗ Nedostupné: ${unavail.length} / ${results.length} (${Math.round(unavail.length/results.length*100)} %)`)
  console.log(`? Error:      ${errs.length}`)
  console.log(`\n5L balení:   ${big5.length} checked → ${big5.filter(r=>r.available===false).length} nedostupné`)
  console.log(`Malé balení: ${small.length} checked → ${small.filter(r=>r.available===false).length} nedostupné`)
  console.log(`\nOverride audit: ${ovrResults.filter(r=>r.available===false).length} správně | ${falseOvr.length} falešných`)
  if (falseOvr.length) { console.log('⚠️ ROLLBACK:'); falseOvr.forEach(r => console.log(`  → ${r.slug} (${r.price} Kč)`)) }
  console.log(`\nDostupné produkty:`)
  ok.forEach(r => console.log(`  ✓ ${r.price} Kč | ${r.slug}`))

  const rep = path.join(OUT_DIR, 'report-v2.json')
  fs.writeFileSync(rep, JSON.stringify({ ts: new Date().toISOString(), results, summary: { total: results.length, ok: ok.length, unavail: unavail.length, errs: errs.length, big5: { n: big5.length, unavail: big5.filter(r=>r.available===false).length }, small: { n: small.length, unavail: small.filter(r=>r.available===false).length }, overrides: { correct: ovrResults.filter(r=>r.available===false).length, false: falseOvr.length } } }, null, 2))
  console.log(`\nReport: ${rep} | Screenshots: ${OUT_DIR}/ss-*.png`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
