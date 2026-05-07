// Per-product lab data research — pro produkty bez acidity/polyphenols/peroxide
// se pokusíme dohledat lab data z webu výrobce.
//
// Strategie:
//   1. Zkusíme brand website (z products.brand_slug → brands.website_url)
//   2. Najdeme product page na brand webu (search by name)
//   3. Stáhneme HTML, dáme Claude k extrakci lab hodnot
//   4. Vrátíme strukturovaný výsledek
//
// Limit: Claude Haiku ~$0.001 per product, takže 100 produktů = ~$0.10.
// Cron-friendly — best-effort, vynech selhání.

import { load } from 'cheerio'
import { callClaude, extractText } from './anthropic'
import { extractAcidity, extractPolyphenols } from './product-scraper'

const MODEL = 'claude-haiku-4-5-20251001'

export interface ProductLabResearchResult {
  acidity: number | null         // %
  polyphenols: number | null     // mg/kg
  peroxideValue: number | null   // mEq O2/kg
  oleicAcidPct: number | null    // %
  source: string                 // URL kde to bylo nalezeno
  confidence: 'high' | 'medium' | 'low'
  notes: string                  // CZ vysvětlení (1-2 věty)
}

const RESEARCH_PROMPT = `Jsi expert na olivový olej. Z HTML dostaneš popis konkrétního produktu od výrobce.

Najdi tyto laboratorní hodnoty (jen explicitně uvedené v textu — nehádej):
- **acidita / kyselost / acidity / acidità**: % volných mastných kyselin (typicky 0.1 - 1.0)
- **polyfenoly / polyphenols / polifenoli**: mg/kg (typicky 50 - 800)
- **peroxidové číslo / peroxide value**: mEq O2/kg (typicky 0 - 25)
- **kyselina olejová / oleic acid**: % (typicky 55 - 83)

Vrať POUZE JSON:
{
  "acidity": 0.32,
  "polyphenols": 285,
  "peroxideValue": 8.5,
  "oleicAcidPct": 75.2,
  "confidence": "high",
  "notes": "Hodnoty z technické specifikace produktu na webu Bartolini."
}

**Pravidla:**
- Hodnota NENÍ explicitně v textu → null (NIKDY nevymýšlet)
- Range "0.32 - 0.8 %" → vezmi spodní hodnotu (naměřená norma)
- Evropské čárky 0,32 → tečka 0.32
- Pouze marketing typu "nízká kyselost" bez čísla → null
- confidence "high" pokud najdeno ≥2 hodnoty s konkrétními čísly
- confidence "low" pokud nic nebo jen vágní fráze`

/**
 * Zkusí najít lab data pro produkt z brand website.
 * Pokud brand_url chybí nebo product page nelze najít, vrátí null.
 */
export async function researchProductLabData(
  productName: string,
  brandWebsiteUrl: string | null
): Promise<ProductLabResearchResult | null> {
  if (!brandWebsiteUrl) return null

  // 1) Zkus najít product page na brand webu
  const productPageHtml = await findProductPage(productName, brandWebsiteUrl)
  if (!productPageHtml) return null

  // 2) Quick regex pass — pokud najdeme přes regex, ušetříme Claude call
  const text = htmlToText(productPageHtml.html)
  const regexAcidity = extractAcidity(text)
  const regexPoly = extractPolyphenols(text)
  if (regexAcidity != null && regexPoly != null) {
    // Máme oba kritické — netřeba Claude
    return {
      acidity: regexAcidity,
      polyphenols: regexPoly,
      peroxideValue: null,
      oleicAcidPct: null,
      source: productPageHtml.url,
      confidence: 'high',
      notes: 'Regex extract z product page na brand webu.',
    }
  }

  // 3) Claude na 4000 prvních znaků (max kontext, ne plné HTML)
  const trimmed = text.slice(0, 4000)
  if (trimmed.length < 100) return null

  try {
    const res = await callClaude({
      model: MODEL,
      max_tokens: 512,
      system: RESEARCH_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Produkt: ${productName}\n\nText z product page (${productPageHtml.url}):\n\n${trimmed}`,
        },
      ],
    })
    const responseText = extractText(res)
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    const parsed = JSON.parse(cleaned) as Partial<ProductLabResearchResult>

    return {
      acidity: safeNum(parsed.acidity, 0, 5),
      polyphenols: safeNum(parsed.polyphenols, 0, 2000, true),
      peroxideValue: safeNum(parsed.peroxideValue, 0, 50),
      oleicAcidPct: safeNum(parsed.oleicAcidPct, 0, 100),
      source: productPageHtml.url,
      confidence: (parsed.confidence === 'high' || parsed.confidence === 'low') ? parsed.confidence : 'medium',
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    }
  } catch (err) {
    console.warn(`[product-lab-research] Claude failed for ${productName}:`, err)
    return null
  }
}

interface ProductPageResult {
  url: string
  html: string
}

/**
 * Hledá product page na brand webu. Strategie:
 *  1. Načti homepage
 *  2. Najdi všechny linky obsahující slova z product name
 *  3. Stáhni nejlepší match
 */
async function findProductPage(
  productName: string,
  brandUrl: string
): Promise<ProductPageResult | null> {
  const baseUrl = brandUrl.replace(/\/$/, '')
  // Klíčová slova z názvu — odstraň generické "olivový olej extra panenský"
  const keywords = productName
    .toLowerCase()
    .replace(/olivový?\s+olej|extra\s+panensk[ýáé]|virgin|olive\s+oil|\d+\s*(?:ml|l)\b/gi, '')
    .split(/\s+/)
    .map(s => s.replace(/[^a-zA-Zàèéìòùěščřžýáíéó]/g, ''))
    .filter(s => s.length >= 3)

  if (keywords.length === 0) return null

  // Limit zatízení per produkt — predtim 7 paths × 3 ranked = 24 fetches × 10s
  // = 4 min worst case. User incident 2026-05-07: 30 produktů × 4 min = >> 15 min timeout.
  // Ted: 3 paths max + 1 ranked candidate = max 4 fetches × 10s = 40s per produkt.
  const candidatePaths = ['/', '/products', '/prodotti']
  const allLinks = new Set<string>()

  for (const path of candidatePaths) {
    try {
      const html = await fetchHtml(baseUrl + path)
      if (!html) continue
      const $ = load(html)
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href')
        if (!href) return
        const linkText = $(el).text().toLowerCase()
        const matchScore = keywords.filter(kw => linkText.includes(kw)).length
        if (matchScore >= 1) {
          const fullUrl = href.startsWith('http')
            ? href
            : href.startsWith('/')
              ? baseUrl + href
              : `${baseUrl}/${href}`
          // Jen interní linky brand webu
          if (fullUrl.includes(new URL(baseUrl).hostname)) {
            allLinks.add(fullUrl)
          }
        }
      })
    } catch (err) {
      // ignore — best effort
    }
    // Pokud uz mame nejake matche, dal nehledame
    if (allLinks.size >= 5) break
  }

  // Vyber nejlepší match — link s nejvíc keywordy v URL
  const ranked = Array.from(allLinks)
    .map(url => ({
      url,
      score: keywords.filter(kw => url.toLowerCase().includes(kw)).length,
    }))
    .sort((a, b) => b.score - a.score)

  // Jen 1 nejlepsi kandidat — bylo 3 ale to znasobovalo fetch volani.
  for (const candidate of ranked.slice(0, 1)) {
    if (candidate.score === 0) break
    const html = await fetchHtml(candidate.url)
    if (html) return { url: candidate.url, html }
  }

  return null
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      // Browser User-Agent — boutique webs (Cloudflare) blokují generic OlivatorBot
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000),  // 6s místo 10s — kratsi worst-case
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function htmlToText(html: string): string {
  const $ = load(html)
  $('script, style, nav, header, footer').remove()
  return $('body').text().replace(/\s+/g, ' ').trim()
}

function safeNum(v: unknown, min: number, max: number, integer = false): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!isFinite(n)) return null
  if (n < min || n > max) return null
  return integer ? Math.round(n) : n
}
