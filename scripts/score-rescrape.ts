// T-27 Fáze 2 — Rescrape kyselosti + polyfenolů z HTML stránek prodejců.
// Používá existující extraktory z lib/product-scraper.ts (regex + Haiku fallback).
// Zapisuje POUZE NULL pole — nepřepisuje admin override.
//
// Flags:
//   --dry-run  (default) — zobraz tabulku, nic nezapisuj
//   --full               — zapiš do DB + recalcuj score
//   --limit=N            — max produktů (default: 15 dry-run, 200 full)
//   --retailer=SLUG      — cíluj jen tohoto retailera

import { supabaseAdmin } from '@/lib/supabase'
import { extractAcidity, extractPolyphenols } from '@/lib/product-scraper'
import { logAgentAction } from '@/lib/audit-log'
import { callClaude, extractText } from '@/lib/anthropic'
import { calculateScore } from '@/lib/score'

const IS_DRY_RUN = !process.argv.includes('--full')
const LIMIT_RAW = process.argv.find(a => a.startsWith('--limit='))?.split('=')[1]
const LIMIT_PARSED = LIMIT_RAW ? parseInt(LIMIT_RAW, 10) : null
const LIMIT = Number.isFinite(LIMIT_PARSED) && (LIMIT_PARSED ?? 0) > 0
  ? Math.min(LIMIT_PARSED!, 500)
  : IS_DRY_RUN ? 15 : 200
const RETAILER_FILTER = process.argv.find(a => a.startsWith('--retailer='))?.split('=')[1] ?? null

const TARGET_RETAILERS = RETAILER_FILTER
  ? [RETAILER_FILTER]
  : ['greekmarket', 'milujemekretu', 'olivarna']

// Validační hranice
const ACIDITY_MIN = 0.10
const ACIDITY_MAX = 0.80
const POLY_MIN = 50
const POLY_MAX = 2800

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// Greekmarket (Shoptet): sekce "Doporučujeme" (related products) stojí v HTML PŘED
// hlavním popisem produktu (<div class="description-inner">). extractAcidity bere
// první výskyt kyselosti → chytá hodnotu z cizího produktu v karuselu.
// Fix: pro greekmarket extrahovat text POUZE z description-inner divě (= after carousel).
// Ostatní retaileři: full HTML.
function extractRetailerText(html: string, retailer: string): string {
  if (retailer === 'greekmarket') {
    const idx = html.indexOf('description-inner')
    if (idx !== -1) {
      const divStart = html.lastIndexOf('<', idx)
      // 8000 chars zachytí celý hlavní popis bez přetečení do dalších sekcí
      return stripHtml(html.slice(divStart, divStart + 8000))
    }
    return '' // žádný description-inner → žádná data
  }
  return stripHtml(html)
}

function extractContext(text: string, keyword: RegExp, chars = 300): string {
  const idx = text.search(keyword)
  if (idx === -1) return ''
  const start = Math.max(0, idx - 50)
  const end = Math.min(text.length, idx + chars)
  return text.slice(start, end)
}

async function haikusExtract(context: string): Promise<{ acidity: number | null; polyphenols: number | null }> {
  const response = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Z níže uvedeného textu extrahuj analytické hodnoty olivového oleje.
Vrať POUZE JSON na jednom řádku, bez komentářů: {"acidity":číslo_nebo_null,"polyphenols":číslo_nebo_null}

Pravidla:
- acidity = kyselost v % jako desetinné číslo (0.2, ne "0,2 %") — hodnota 0.05–0.8
- polyphenols = polyfenoly v mg/kg jako celé číslo (např. 450) — hodnota 50–2800
- pokud hodnota chybí nebo je jen obecná ("nízká kyselost"), vrať null
- "až 0,2 %" nebo "pod 0,3 %" → vezmi číslo (0.2, 0.3)

Text: ${context.slice(0, 500)}`
    }],
  })
  const raw = extractText(response).trim()
  try {
    const parsed = JSON.parse(raw.match(/\{[^}]+\}/)?.[0] ?? '{}') as { acidity?: number; polyphenols?: number }
    return {
      acidity: typeof parsed.acidity === 'number' ? parsed.acidity : null,
      polyphenols: typeof parsed.polyphenols === 'number' ? parsed.polyphenols : null,
    }
  } catch {
    return { acidity: null, polyphenols: null }
  }
}

function validateAcidity(v: number | null): { valid: boolean; value: number | null; flag?: string } {
  if (v == null) return { valid: false, value: null }
  if (v < ACIDITY_MIN || v > ACIDITY_MAX) return { valid: false, value: null, flag: `out-of-range: ${v}` }
  return { valid: true, value: Math.round(v * 100) / 100 }
}

function validatePolyphenols(v: number | null): { valid: boolean; value: number | null; flag?: string } {
  if (v == null) return { valid: false, value: null }
  const n = Math.round(v)
  if (n < POLY_MIN || n > POLY_MAX) return { valid: false, value: null, flag: `out-of-range: ${n}` }
  return { valid: true, value: n }
}

// Detekuje false positive: extractPolyphenols vrátí 1090 pro "polyfenolů 1 090 Kč"
// protože NUM pattern zahrnuje \d{1,2}[\s]\d{3} (tisíce). Pokud číslo v textu
// bezprostředně předchází "Kč", jde o cenu, ne mg/kg.
function isPolyValuePrice(text: string, value: number): boolean {
  const s = String(value) // "1090"
  // Hledej buď "1090 Kč" nebo "1 090 Kč" (tisíce) v textu
  const patterns = [
    new RegExp(`${s}\\s{0,3}Kč`, 'i'),
  ]
  if (s.length > 3) {
    const th = s.slice(0, -3)
    const hnd = s.slice(-3)
    patterns.push(new RegExp(`${th}[\\s\\u00A0]${hnd}\\s{0,3}Kč`, 'i'))
  }
  return patterns.some(p => p.test(text))
}

interface RowResult {
  productId: string
  slug: string
  name: string
  retailer: string
  url: string
  regexAcidity: number | null
  regexPolyphenols: number | null
  aiAcidity: number | null
  aiPolyphenols: number | null
  finalAcidity: number | null
  finalPolyphenols: number | null
  acidityFlag: string | null
  polyFlag: string | null
  matchedAcidText: string
  matchedPolyText: string
  httpStatus: number | null
  usedAi: boolean
}

async function processProduct(
  productId: string,
  slug: string,
  name: string,
  retailer: string,
  url: string
): Promise<RowResult> {
  const row: RowResult = {
    productId, slug, name, retailer, url,
    regexAcidity: null, regexPolyphenols: null,
    aiAcidity: null, aiPolyphenols: null,
    finalAcidity: null, finalPolyphenols: null,
    acidityFlag: null, polyFlag: null,
    matchedAcidText: '', matchedPolyText: '',
    httpStatus: null, usedAi: false,
  }

  let text = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Olivator-bot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    row.httpStatus = res.status
    if (!res.ok) return row
    const html = await res.text()
    text = extractRetailerText(html, retailer)
  } catch {
    row.httpStatus = 0
    return row
  }

  // 1. Regex extraction
  row.regexAcidity = extractAcidity(text)
  row.regexPolyphenols = extractPolyphenols(text)

  // Post-extraction filter: pokud je extractPolyphenols výsledek cena (Kč), zahoď ho.
  // Root cause: NUM pattern v lib/product-scraper.ts zahrnuje \d{1,2}[\s]\d{3} (tisíce).
  // "polyfenolů 1 090 Kč" (cena) matchuje stejně jako "polyfenolů 1 090 mg/kg" (polyfenoly).
  if (row.regexPolyphenols != null && isPolyValuePrice(text, row.regexPolyphenols)) {
    row.regexPolyphenols = null
  }

  // 2. Haiku fallback — POUZE pro kyselost (ne polyfenoly).
  // Guard: context musí obsahovat číslo — jinak jde o sidebar/navigace bez hodnoty
  // (olivum.cz: "Acidita jako ukazatel kvality olivového oleje" = titulek blogu bez čísla).
  const acidKeyword = /kyselos|acidit|acidity/i
  const needsAiAcid = row.regexAcidity == null && acidKeyword.test(text)

  if (needsAiAcid) {
    const context = extractContext(text, acidKeyword)
    const contextHasNumber = /\d/.test(context)
    if (contextHasNumber) {
      try {
        const ai = await haikusExtract(context)
        row.aiAcidity = ai.acidity
        row.usedAi = true
      } catch {
        // Haiku selhal — pokračujeme bez AI hodnot
      }
    }
  }

  // 3. Vybrat nejlepší hodnotu (regex priorita nad AI)
  const vAcid = validateAcidity(row.regexAcidity ?? row.aiAcidity)
  const vPoly = validatePolyphenols(row.regexPolyphenols ?? row.aiPolyphenols)
  row.finalAcidity = vAcid.value
  row.acidityFlag = vAcid.flag ?? null
  row.finalPolyphenols = vPoly.value
  row.polyFlag = vPoly.flag ?? null

  // 4. Evidence context pro audit log
  if (row.finalAcidity != null) {
    row.matchedAcidText = extractContext(text, acidKeyword, 120)
  }
  if (row.finalPolyphenols != null) {
    row.matchedPolyText = extractContext(text, /polyfenol|polyphenol/i, 120)
  }

  return row
}

async function main() {
  console.log(`\n═══ Score Rescrape — ${IS_DRY_RUN ? 'DRY-RUN' : 'FULL RUN'} ═══`)
  console.log(`Target retaileři: ${TARGET_RETAILERS.join(', ')}`)
  console.log(`Limit: ${LIMIT} produktů\n`)

  // Načti produkty EVOO/virgin bez score z cílových retailerů
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select(`
      product_id,
      product_url,
      in_stock,
      retailers!inner(slug, name),
      products!inner(id, slug, name, type, olivator_score, acidity, polyphenols)
    `)
    .eq('in_stock', true)
    .in('retailers.slug', TARGET_RETAILERS)
    .is('products.olivator_score', null)
    .in('products.type', ['evoo', 'virgin'])
    .not('product_url', 'is', null)
    .limit(LIMIT * 3) // over-fetch, dedupujeme per product

  if (!offers?.length) {
    console.log('Žádné produkty k zpracování.')
    return
  }

  // Dedupuj — jeden produkt může být u více retailerů; vezmi první target retailer hit
  const seen = new Set<string>()
  const queue: Array<{ productId: string; slug: string; name: string; retailer: string; url: string }> = []
  for (const o of offers) {
    const p = o.products as unknown as { id: string; slug: string; name: string; type: string; acidity: number | null; polyphenols: number | null }
    const r = o.retailers as unknown as { slug: string; name: string }
    if (seen.has(p.id)) continue
    seen.add(p.id)
    queue.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      retailer: r.slug,
      url: o.product_url as string,
    })
    if (queue.length >= LIMIT) break
  }

  console.log(`Nalezeno ${queue.length} produktů k zpracování\n`)

  const results: RowResult[] = []
  let fetched = 0

  for (const item of queue) {
    process.stdout.write(`  [${++fetched}/${queue.length}] ${item.slug.slice(0, 50).padEnd(50)} `)
    const row = await processProduct(item.productId, item.slug, item.name, item.retailer, item.url)
    results.push(row)

    const acid = row.finalAcidity != null ? `acidity=${row.finalAcidity}` : '—'
    const poly = row.finalPolyphenols != null ? `poly=${row.finalPolyphenols}` : '—'
    const ai = row.usedAi ? '[AI]' : ''
    console.log(`${acid.padEnd(14)} ${poly.padEnd(12)} ${ai}`)

    // Rate limiting — nezdá se zdvořilé hammr-ovat 5 request/s
    await new Promise(r => setTimeout(r, 1200))
  }

  // ── Výsledková tabulka ──────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(100))
  console.log('  VÝSLEDKY DRY-RUN\n')
  console.log(`  ${'SLUG'.padEnd(50)} ${'RETAILER'.padEnd(16)} ${'KYSELOST'.padEnd(12)} ${'POLYFENOLY'.padEnd(12)} AI?  STAV`)
  console.log(`  ${'─'.repeat(50)} ${'─'.repeat(16)} ${'─'.repeat(12)} ${'─'.repeat(12)} ─── ────────`)

  let gotAcid = 0, gotPoly = 0, got404 = 0, flagged = 0
  for (const r of results) {
    const acid = r.finalAcidity != null ? `${r.finalAcidity} %` : (r.acidityFlag ? `⚠ ${r.acidityFlag}` : '—')
    const poly = r.finalPolyphenols != null ? `${r.finalPolyphenols} mg/kg` : (r.polyFlag ? `⚠ ${r.polyFlag}` : '—')
    const ai = r.usedAi ? '✓' : ' '
    const status = r.httpStatus === 0 ? 'TIMEOUT' : r.httpStatus !== 200 ? `HTTP ${r.httpStatus}` : 'OK'
    console.log(`  ${r.slug.slice(0, 49).padEnd(50)} ${r.retailer.slice(0, 15).padEnd(16)} ${acid.padEnd(12)} ${poly.padEnd(12)} ${ai}    ${status}`)

    if (r.finalAcidity != null) gotAcid++
    if (r.finalPolyphenols != null) gotPoly++
    if (r.httpStatus !== 200) got404++
    if (r.acidityFlag || r.polyFlag) flagged++
  }

  console.log('\n' + '═'.repeat(100))
  console.log(`  Z ${results.length} produktů:`)
  console.log(`  Kyselost nalezena:    ${gotAcid} (${Math.round(gotAcid/results.length*100)} %)`)
  console.log(`  Polyfenoly nalezeny:  ${gotPoly} (${Math.round(gotPoly/results.length*100)} %)`)
  console.log(`  Fetch selhání (4xx+): ${got404}`)
  console.log(`  Flagované hodnoty:    ${flagged}`)

  if (IS_DRY_RUN) {
    // Zobraz matched text pro produkty kde jsme něco našli
    const found = results.filter(r => r.finalAcidity != null || r.finalPolyphenols != null)
    if (found.length > 0) {
      console.log('\n  MATCHED TEXT (pro ověření extrakce):')
      for (const r of found) {
        console.log(`\n  ── ${r.slug.slice(0, 60)} (${r.retailer}) ──`)
        if (r.finalAcidity != null && r.matchedAcidText) {
          console.log(`  kyselost=${r.finalAcidity}% | "${r.matchedAcidText.slice(0, 150)}"`)
        }
        if (r.finalPolyphenols != null && r.matchedPolyText) {
          console.log(`  polyfenoly=${r.finalPolyphenols}mg/kg | "${r.matchedPolyText.slice(0, 150)}"`)
        }
      }
    }
    console.log('\n  DRY-RUN — nic nezapsáno. Spusť s --full pro zápis.\n')
    return
  }

  // ── Full run — zápis do DB ───────────────────────────────────────────────
  console.log('\n  Zapisuji do DB...')
  let written = 0, skipped = 0, scored = 0

  for (const r of results) {
    if (r.finalAcidity == null && r.finalPolyphenols == null) {
      skipped++
      continue
    }

    // Načti aktuální hodnoty — nezapisuj pokud admin už něco nastavil
    const { data: current } = await supabaseAdmin
      .from('products')
      .select('acidity, polyphenols')
      .eq('id', r.productId)
      .maybeSingle()
    if (!current) { skipped++; continue }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (r.finalAcidity != null && current.acidity == null) patch.acidity = r.finalAcidity
    if (r.finalPolyphenols != null && current.polyphenols == null) patch.polyphenols = r.finalPolyphenols

    if (Object.keys(patch).length <= 1) { skipped++; continue } // jen updated_at

    await supabaseAdmin.from('products').update(patch).eq('id', r.productId)
    written++

    await logAgentAction({
      agentName: 'score-rescrape',
      decisionType: 'spec_filled',
      payload: {
        product_id: r.productId,
        slug: r.slug,
        retailer: r.retailer,
        source_url: r.url,
        acidity_written: patch.acidity ?? null,
        polyphenols_written: patch.polyphenols ?? null,
        used_ai: r.usedAi,
        matched_acid_text: r.matchedAcidText.slice(0, 200),
        matched_poly_text: r.matchedPolyText.slice(0, 200),
      },
    })

    // Pokus o score recalc pokud máme acidity
    if (patch.acidity != null) {
      const { data: fresh } = await supabaseAdmin
        .from('products')
        .select('acidity, polyphenols, peroxide_value, certifications, volume_ml')
        .eq('id', r.productId)
        .maybeSingle()
      const { data: cheapestOffer } = await supabaseAdmin
        .from('product_offers')
        .select('price')
        .eq('product_id', r.productId)
        .eq('in_stock', true)
        .gt('price', 0)
        .order('price', { ascending: true })
        .limit(1)
        .maybeSingle()

      const volumeMl = fresh?.volume_ml ? Number(fresh.volume_ml) : null
      const price = cheapestOffer?.price ? Number(cheapestOffer.price) : null
      const pricePer100ml = price && volumeMl ? (price / volumeMl) * 100 : null

      const scoreResult = calculateScore({
        acidity: fresh?.acidity ? Number(fresh.acidity) : null,
        polyphenols: fresh?.polyphenols ?? null,
        peroxideValue: fresh?.peroxide_value ? Number(fresh.peroxide_value) : null,
        certifications: fresh?.certifications as string[] ?? [],
        pricePer100ml,
        type: 'evoo',
      })

      if (!scoreResult.insufficientData && scoreResult.total > 0) {
        await supabaseAdmin.from('products').update({
          olivator_score: scoreResult.total,
          score_breakdown: scoreResult.breakdown,
        }).eq('id', r.productId)
        console.log(`  ✓ Score ${r.slug}: ${scoreResult.total}/100`)
        scored++
      }
    }
  }

  console.log(`\n  Zapsáno: ${written} produktů, přeskočeno: ${skipped}`)
  console.log(`  Nové Score: ${scored} produktů`)
  console.log('\n  ✓ Hotovo\n')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
