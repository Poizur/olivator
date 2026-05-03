// Retailer auto-research — z domény vytáhne info pro prezentaci eshopu
// (tagline, story, founders, headquarters, founded_year, specialization,
// logo URL). Použito v admin retailer formuláři jako tlačítko „Vyplnit
// prezentaci automaticky" — uspoří user manuální copy/paste z Claude.ai.
//
// Pipeline:
//   1. Fetch homepage + nejčastěji „o nás" stránky (zkouší různé URL slugy)
//   2. Sloučí HTML, extrahuje text + meta tagy + nejlepší logo image src
//   3. Claude Haiku 4.5 extrahuje strukturovaný JSON dle schématu
//   4. Vrátí návrh — endpoint NEUKLÁDÁ, user vidí v modalu, schválí, uloží
//
// Bezpečnostní pravidla (CLAUDE.md sekce 16):
//   - System prompt: pokud info chybí, vrať null. NEFABRIKOVAT data.
//   - Validace: každé pole prochází sanity check (rok 1900-aktuální, atd.)

import { load } from 'cheerio'
import { callClaude, extractText } from './anthropic'

export interface RetailerResearchResult {
  tagline: string | null
  story: string | null
  founders: string | null
  headquarters: string | null
  foundedYear: number | null
  specialization: string | null
  logoUrl: string | null
  // Diagnostika pro admin UI
  pagesScanned: string[]
  warnings: string[]
}

// Common „o nás" / kontakt slugs pro CZ Shoptet/WooCommerce/custom CMS.
// Pořadí = priorita (první match poskytne lepší příběh).
const ABOUT_PATHS = [
  '/o-nas',
  '/onas',
  '/about',
  '/kdo-jsme',
  '/o-eshopu',
  '/o-projektu',
  '/kontakt',
  '/contact',
  '/info',
]

const FETCH_TIMEOUT_MS = 8000

async function safeFetch(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'OlivatorBot/1.0 (+https://olivator.cz)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html')) return null
    return await res.text()
  } catch {
    return null
  }
}

interface ScrapedPage {
  url: string
  text: string
  logoUrls: string[]
  metaDescription: string | null
}

function extractFromHtml(url: string, html: string): ScrapedPage {
  const $ = load(html)

  $('script, style, noscript, iframe, svg').remove()

  const text = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)

  const metaDescription =
    $('meta[name="description"]').attr('content') ??
    $('meta[property="og:description"]').attr('content') ??
    null

  const logoUrls: string[] = []
  // Kandidáti na logo dle typu Shoptet / Wordpress / custom
  const logoSelectors = [
    'img[src*="logo"]',
    'img[alt*="logo"]',
    'img[alt*="Logo"]',
    'header img',
    '.logo img',
    '.header-logo img',
  ]
  for (const sel of logoSelectors) {
    $(sel).each((_, el) => {
      const src = $(el).attr('src')
      if (src) logoUrls.push(src)
    })
  }

  // OG image jako fallback (často brand image)
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) logoUrls.push(ogImage)

  return { url, text, logoUrls, metaDescription }
}

function resolveAbsolute(baseUrl: string, maybeRelative: string): string {
  try {
    return new URL(maybeRelative, baseUrl).toString()
  } catch {
    return maybeRelative
  }
}

const SYSTEM_PROMPT = `Jsi research asistent pro Olivator.cz — srovnávač olivových olejů v ČR.

ÚKOL: Z poskytnutého textu webu eshopu vytáhni strukturované info pro
prezentační kartu eshopu na olivator.cz.

KRITICKÉ PRAVIDLO:
- Vyplňuj POUZE info které najdeš v textu. NEFABRIKUJ.
- Pokud něco není v textu (rok založení, jména zakladatelů, sídlo) → vrať null.
- Lepší prázdné pole než vymyšlené datum / jméno / město.

VÝSTUP — pouze validní JSON, žádný markdown:
{
  "tagline": "1 věta, max 160 znaků, popisující eshop · jako redaktor pro web olivator.cz · žádné fráze typu „prémiový", „výjimečný"",
  "story": "2-4 věty · příběh eshopu (kdo to dělá, proč, čím je specifický) · cituj fakta z textu · přirozená čeština",
  "founders": "Jména zakladatelů, např. „Zdeněk a Marcelka" · null pokud nenajdeš",
  "headquarters": "Město / region kanceláře nebo skladu · null pokud nenajdeš",
  "foundedYear": 2020,
  "specialization": "Co eshop prodává v 5-12 slovech, např. „Řecké potraviny — oleje, med, BIO" · null pokud nejasné"
}

Tón story: chytrý kamarád sommelier, ne marketingový copywriter. Konkrétní fakta > obecné chvalozpěvy.`

interface LlmExtract {
  tagline: string | null
  story: string | null
  founders: string | null
  headquarters: string | null
  foundedYear: number | null
  specialization: string | null
}

async function llmExtract(combinedText: string): Promise<LlmExtract> {
  const response = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: combinedText }],
  })
  const raw = extractText(response).trim()
  // Odřízni případný ```json ... ``` wrap
  const jsonStr = raw.replace(/^```(?:json)?\s*|\s*```$/g, '')
  try {
    const parsed = JSON.parse(jsonStr) as Partial<LlmExtract>
    return {
      tagline: typeof parsed.tagline === 'string' ? parsed.tagline.trim() : null,
      story: typeof parsed.story === 'string' ? parsed.story.trim() : null,
      founders: typeof parsed.founders === 'string' ? parsed.founders.trim() : null,
      headquarters: typeof parsed.headquarters === 'string' ? parsed.headquarters.trim() : null,
      foundedYear:
        typeof parsed.foundedYear === 'number' && parsed.foundedYear >= 1900 && parsed.foundedYear <= 2100
          ? parsed.foundedYear
          : null,
      specialization: typeof parsed.specialization === 'string' ? parsed.specialization.trim() : null,
    }
  } catch {
    return {
      tagline: null,
      story: null,
      founders: null,
      headquarters: null,
      foundedYear: null,
      specialization: null,
    }
  }
}

function pickBestLogo(allUrls: string[]): string | null {
  if (allUrls.length === 0) return null
  // Preferuj URLs co obsahují „logo" v cestě, ne svg-as-data:
  const ranked = allUrls.filter(u => !u.startsWith('data:'))
  const withLogo = ranked.find(u => /logo/i.test(u))
  if (withLogo) return withLogo
  return ranked[0] ?? null
}

export async function researchRetailer(domain: string): Promise<RetailerResearchResult> {
  const warnings: string[] = []
  const pagesScanned: string[] = []

  // Normalize domain
  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim()
  if (!cleanDomain) throw new Error('Doména nesmí být prázdná')

  const baseUrl = `https://${cleanDomain}`

  // Fetch homepage
  const homepage = await safeFetch(baseUrl)
  if (!homepage) {
    throw new Error(`Nelze načíst ${baseUrl} (timeout / 4xx / non-HTML)`)
  }
  const homePage = extractFromHtml(baseUrl, homepage)
  pagesScanned.push(baseUrl)

  // Try about pages — zastavíme po prvních 2 úspěšných
  const aboutPages: ScrapedPage[] = []
  for (const path of ABOUT_PATHS) {
    if (aboutPages.length >= 2) break
    const url = `${baseUrl}${path}`
    const html = await safeFetch(url)
    if (html) {
      aboutPages.push(extractFromHtml(url, html))
      pagesScanned.push(url)
    }
  }

  if (aboutPages.length === 0) {
    warnings.push('Žádná „o nás" stránka nenalezena — extrakt bude jen z homepage.')
  }

  // Sloučení textů pro LLM (homepage + about) — limit ~12k chars (Haiku rychlý)
  const combinedText = [
    `URL: ${baseUrl}`,
    `Homepage meta: ${homePage.metaDescription ?? '(žádný)'}`,
    `Homepage text:\n${homePage.text.slice(0, 4000)}`,
    ...aboutPages.map(
      p => `\n--- ${p.url} ---\nMeta: ${p.metaDescription ?? '(žádný)'}\n${p.text.slice(0, 4000)}`
    ),
  ].join('\n')

  const extracted = await llmExtract(combinedText)

  // Logo: aggregate ze všech scanned pages, vyber nejlepší
  const allLogoUrls = [
    ...homePage.logoUrls,
    ...aboutPages.flatMap(p => p.logoUrls),
  ].map(u => resolveAbsolute(baseUrl, u))
  const logoUrl = pickBestLogo(allLogoUrls)

  // Sanity validation
  if (extracted.tagline && extracted.tagline.length > 200) {
    warnings.push('Tagline zkrácen — přesahoval 200 znaků.')
    extracted.tagline = extracted.tagline.slice(0, 160)
  }

  return {
    tagline: extracted.tagline,
    story: extracted.story,
    founders: extracted.founders,
    headquarters: extracted.headquarters,
    foundedYear: extracted.foundedYear,
    specialization: extracted.specialization,
    logoUrl,
    pagesScanned,
    warnings,
  }
}
