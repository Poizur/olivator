/**
 * Feed-vs-web availability check — Playwright
 * Ověří, zda produkty označené v feedu jako in_stock jsou skutečně dostupné
 * na produktových stránkách e-shopu.
 *
 * Run (Erato + 10 random): npx tsx --env-file=.env.local scripts/feed-vs-web-check.ts
 * Run (všechny): npx tsx --env-file=.env.local scripts/feed-vs-web-check.ts --all
 * Run (konkrétní): npx tsx --env-file=.env.local scripts/feed-vs-web-check.ts --url=https://...
 */
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Výrazy označující nedostupnost (case-insensitive)
const UNAVAILABLE_PATTERNS = [
  'vyprodáno', 'vyprodano', 'nedostupné', 'nedostupne',
  'není skladem', 'neni skladem', 'out of stock', 'sold out',
  'momentálně nedostupné', 'momentalne nedostupne',
  'není k dispozici', 'neni k dispozici', 'dočasně nedostupné',
]

/**
 * Priorita: structured data → buy button disabled → main section text.
 * NIKDY full-page scan — cross-sell widgety obsahují "Vyprodáno" u jiných produktů.
 */
async function checkAvailability(page: import('playwright').Page, url: string): Promise<{
  available: boolean
  reason: string
  bodySnippet: string
}> {
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    if (!res || !res.ok()) {
      return { available: false, reason: `HTTP ${res?.status() ?? '?'}`, bodySnippet: '' }
    }

    // 1. Structured data
    const domAvail = await page.evaluate(() => {
      const el = document.querySelector('[itemprop="availability"]')
      if (el) return el.getAttribute('content') ?? el.textContent ?? ''
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      for (const s of scripts) {
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
          const r = dig(d); if (r) return r
        } catch { /* ignore */ }
      }
      return ''
    }).catch(() => '')

    if (domAvail) {
      const lo = domAvail.toLowerCase()
      if (lo.includes('instock') || lo.includes('in_stock')) return { available: true, reason: `LD: ${domAvail.slice(0, 60)}`, bodySnippet: '' }
      if (lo.includes('outofstock') || lo.includes('out_of_stock')) return { available: false, reason: `LD: ${domAvail.slice(0, 60)}`, bodySnippet: '' }
    }

    // 2. Buy button
    const buyBtn = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], .btn-buy, [class*="buy-btn"], [class*="add-to-cart"]'))
      for (const el of candidates) {
        const t = (el.textContent || '').toLowerCase()
        const v = ((el as HTMLInputElement).value || '').toLowerCase()
        if (['přidat', 'koupit', 'do košíku', 'vložit', 'objednat'].some(kw => t.includes(kw) || v.includes(kw))) {
          return { found: true, disabled: (el as HTMLButtonElement).disabled || el.getAttribute('disabled') !== null }
        }
      }
      return { found: false, disabled: false }
    }).catch(() => ({ found: false, disabled: false }))

    if (buyBtn.found) {
      return { available: !buyBtn.disabled, reason: `buy-btn disabled=${buyBtn.disabled}`, bodySnippet: '' }
    }

    // 3. Main section text only (ne celá stránka!)
    const mainText = await page.evaluate(() => {
      const sels = ['.product-detail__info', '.product-detail', '.product-info', '[class*="product-detail"]', 'main .product', '.entry-summary', 'form[action*="cart"]', 'main']
      for (const sel of sels) {
        const el = document.querySelector(sel)
        if (el && (el.textContent?.length ?? 0) > 50) return el.textContent?.toLowerCase() ?? ''
      }
      return ''
    }).catch(() => '')

    for (const pattern of UNAVAILABLE_PATTERNS) {
      if (mainText.includes(pattern)) {
        const idx = mainText.indexOf(pattern)
        return { available: false, reason: `main-section: "${pattern}"`, bodySnippet: mainText.slice(Math.max(0, idx - 30), idx + 60).replace(/\n/g, ' ') }
      }
    }

    return { available: true, reason: 'no-signal (assume avail)', bodySnippet: '' }
  } catch (err) {
    return { available: false, reason: `error: ${err instanceof Error ? err.message : String(err)}`, bodySnippet: '' }
  }
}

async function main() {
  const checkAll = process.argv.includes('--all')
  const urlArg = process.argv.find(a => a.startsWith('--url='))?.slice(6)
  const retailerSlug = 'reckonasbavi'
  const RETAILER_ID = '83525b89-23ec-4432-a38a-497839156aa8'

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (compatible; Olivator-check/1.0)' })

  try {
    let offersToCheck: Array<{ product_id: string; price: number; product_url: string; slug?: string }>

    if (urlArg) {
      offersToCheck = [{ product_id: '', price: 0, product_url: urlArg }]
    } else {
      // Erato vždy jako první
      const { data: allOffers } = await sb
        .from('product_offers')
        .select('product_id, price, product_url, products!inner(slug)')
        .eq('retailer_id', RETAILER_ID)
        .eq('in_stock', true)
        .not('product_url', 'is', null)
        .order('price', { ascending: false }) // dražší = pravděpodobnější problém

      const mapped = (allOffers ?? []).map((o: Record<string, unknown>) => ({
        product_id: o.product_id as string,
        price: Number(o.price),
        product_url: o.product_url as string,
        slug: (o.products as { slug: string } | null)?.slug,
      }))

      // Erato jako první, pak náhodný vzorek
      const erato = mapped.find(o => o.product_url?.includes('erato'))
      const rest = mapped.filter(o => !o.product_url?.includes('erato'))
      const sample = checkAll ? rest : rest.sort(() => Math.random() - 0.5).slice(0, 9)
      offersToCheck = erato ? [erato, ...sample] : sample
    }

    console.log(`[check] Kontroluji ${offersToCheck.length} URLs u ${retailerSlug}...`)
    console.log('─'.repeat(70))

    const mismatches: typeof offersToCheck = []
    const page = await ctx.newPage()

    for (const offer of offersToCheck) {
      const result = await checkAvailability(page, offer.product_url)
      const match = result.available ? '✓ OK   ' : '✗ NESHODA'
      console.log(`${match} | ${offer.price} Kč | ${offer.slug ?? offer.product_url}`)
      if (!result.available) {
        console.log(`         Důvod: ${result.reason}`)
        if (result.bodySnippet) console.log(`         Text: "${result.bodySnippet}"`)
        mismatches.push(offer)
      }
      await new Promise(r => setTimeout(r, 2_000)) // šetrný delay
    }

    await page.close()
    console.log('─'.repeat(70))
    console.log(`\n[check] Výsledek: ${mismatches.length}/${offersToCheck.length} neshod (feed=in_stock, web=nedostupné)`)

    if (mismatches.length > 0) {
      console.log('\n[check] Nesouvislé produkty (manual override kandidáti):')
      for (const m of mismatches) {
        console.log(`  → ${m.slug ?? m.product_url} (${m.price} Kč) — ID: ${m.product_id}`)
      }

      // Aplikovat manual override?
      const applyOverride = process.argv.includes('--apply-override')
      if (applyOverride && !urlArg) {
        console.log('\n[check] Aplikuji manual_override=true, in_stock=false...')
        for (const m of mismatches) {
          if (!m.product_id) continue
          const { error } = await sb.from('product_offers')
            .update({
              in_stock: false,
              manual_override: true,
              override_note: `feed říká in_stock, web říká nedostupné, ${new Date().toISOString().slice(0, 10)}`,
            })
            .eq('product_id', m.product_id)
            .eq('retailer_id', RETAILER_ID)
          if (error) console.error(`  ✗ ${m.slug}: ${error.message}`)
          else console.log(`  ✓ ${m.slug}: manual_override nastaven`)
        }
      } else if (mismatches.length > 0) {
        console.log('\n[check] Pro aplikaci override spusť s --apply-override')
      }

      if (mismatches.length > 1) {
        console.log('\n[check] ── PODKLAD PRO PARTNER EMAIL ──────────────────────────')
        console.log(`Adresát: Řecko nás baví (shop.reckonasbavi.cz)`)
        console.log(`Problém: ${mismatches.length} produktů ve vašem Heureka feedu je označeno`)
        console.log(`jako dostupné (deliveryDate=0), ale na produktových stránkách`)
        console.log(`webu jsou zobrazeny jako nedostupné/vyprodané.`)
        console.log(``)
        console.log(`Dotčené produkty:`)
        for (const m of mismatches) console.log(`  - ${m.slug} (${m.price} Kč): ${m.product_url}`)
        console.log(``)
        console.log(`Dopady: Heureka za nesprávnou dostupnost uděluje penalizace.`)
        console.log(`Prosíme o opravu feedu nebo potvrzení dostupnosti.`)
        console.log('────────────────────────────────────────────────────────────')
      }
    }

  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('[check] FATAL:', err)
  process.exit(1)
})
