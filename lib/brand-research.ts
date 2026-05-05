// Brand auto-research — z URL výrobce (např. oliointini.it) extrahuje
// strukturovaný profil pro brand detail stránku: story, philosophy,
// founded_year, headquarters, family_owned, certifications, plus URL loga.
//
// Workflow:
//   1. Fetch homepage + nejčastěji "about" / "chi-siamo" / "our story"
//   2. Sloučí HTML, extrahuje text + meta tagy + nejlepší logo image
//   3. Claude Haiku → JSON dle schématu
//   4. Vrátí návrh — endpoint NEUKLÁDÁ, admin schválí v UI
//
// Pattern stejný jako lib/retailer-research.ts.

import { load } from 'cheerio'
import { callClaude, extractText } from './anthropic'

export interface BrandResearchResult {
  descriptionShort: string | null
  descriptionLong: string | null
  story: string | null
  philosophy: string | null
  foundedYear: number | null
  headquarters: string | null
  familyOwned: boolean | null
  certifications: string[]
  websiteUrl: string | null
  logoUrl: string | null
  pagesScanned: string[]
  warnings: string[]
}

// "O nás" stránky pro typické olivářské eshopy + výrobcové weby (italsky,
// řecky, anglicky, česky).
const ABOUT_PATHS = [
  '/about',
  '/about-us',
  '/our-story',
  '/our-history',
  '/heritage',
  '/family',
  '/azienda',           // italsky
  '/chi-siamo',         // italsky
  '/storia',            // italsky
  '/la-famiglia',       // italsky
  '/etairia',           // řecky
  '/o-nas',             // česky
  '/onas',              // česky
  '/historie',          // česky
  '/en/about',
  '/en/history',
  '/it/azienda',
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

  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)

  const metaDescription =
    $('meta[name="description"]').attr('content') ??
    $('meta[property="og:description"]').attr('content') ??
    null

  // Logo kandidáti — preferuj <img> v <header>, src obsahuje "logo", alt obsahuje "logo"
  const logoUrls: string[] = []
  const selectors = [
    'header img[src*="logo" i]',
    'header img[alt*="logo" i]',
    'a.logo img',
    '.logo img',
    '.site-logo img',
    '.brand-logo img',
    '#logo img',
    'header img',
    'img[src*="logo" i]',
    'img[alt*="logo" i]',
  ]
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const src = $(el).attr('src')
      if (src) logoUrls.push(src)
    })
  }
  // OG image jako fallback
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

function pickBestLogo(allUrls: string[]): string | null {
  if (allUrls.length === 0) return null
  // Skip data: URIs, SVG inline, tracking pixels
  const ranked = allUrls.filter(u => !u.startsWith('data:'))
  // 1) URL contains "logo"
  const withLogo = ranked.find(u => /logo/i.test(u))
  if (withLogo) return withLogo
  // 2) PNG / SVG (než JPG hero)
  const png = ranked.find(u => /\.(png|svg)/i.test(u))
  if (png) return png
  return ranked[0] ?? null
}

const SYSTEM_PROMPT = `Jsi research asistent pro Olivator.cz. Z poskytnutého textu webu
výrobce olivového oleje vytáhni strukturovaný profil pro značku.

KRITICKÉ:
- Vyplňuj POUZE info které najdeš v textu. NEFABRIKUJ.
- Pokud něco není v textu, vrať null.
- Lepší prázdné pole než vymyšlené datum / místo / jméno.

VÝSTUP — pouze validní JSON, žádné backticks:
{
  "descriptionShort": "1-2 věty, max 200 znaků, popis značky pro listing kartu",
  "descriptionLong": "3-6 odstavců markdown, kompletní příběh značky, plné fakta o stylu / tradici / regionu / rodině",
  "story": "Konkrétní příběh zakladatele/rodiny/farmy ve 2-3 odstavcích markdown — kdy začalo, kdo, proč. Null pokud na webu není.",
  "philosophy": "Co dělají jinak / čemu věří — 1-2 odstavce markdown. Null pokud se to nedá extrahovat.",
  "foundedYear": 1980,
  "headquarters": "Město / region (např. 'Alberobello, Apulie'). Null pokud nejasné.",
  "familyOwned": true,
  "certifications": ["DOP", "BIO"],
  "websiteUrl": "https://oliointini.it"
}

Tón story: konkrétní fakta, jména, roky. Žádné marketingové obecnosti.
familyOwned je true jen pokud explicitně řečeno. Certifikace jen ty zmíněné.`

interface LlmExtract {
  descriptionShort: string | null
  descriptionLong: string | null
  story: string | null
  philosophy: string | null
  foundedYear: number | null
  headquarters: string | null
  familyOwned: boolean | null
  certifications: string[]
  websiteUrl: string | null
}

async function llmExtract(combinedText: string): Promise<LlmExtract> {
  const response = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: combinedText }],
  })
  const raw = extractText(response).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try {
    const parsed = JSON.parse(raw) as Partial<LlmExtract>
    return {
      descriptionShort: typeof parsed.descriptionShort === 'string' ? parsed.descriptionShort.trim().slice(0, 250) : null,
      descriptionLong: typeof parsed.descriptionLong === 'string' ? parsed.descriptionLong.trim() : null,
      story: typeof parsed.story === 'string' ? parsed.story.trim() : null,
      philosophy: typeof parsed.philosophy === 'string' ? parsed.philosophy.trim() : null,
      foundedYear:
        typeof parsed.foundedYear === 'number' && parsed.foundedYear >= 1800 && parsed.foundedYear <= 2100
          ? parsed.foundedYear
          : null,
      headquarters: typeof parsed.headquarters === 'string' ? parsed.headquarters.trim() : null,
      familyOwned: typeof parsed.familyOwned === 'boolean' ? parsed.familyOwned : null,
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications.filter((c): c is string => typeof c === 'string').map((c) => c.trim())
        : [],
      websiteUrl: typeof parsed.websiteUrl === 'string' ? parsed.websiteUrl.trim() : null,
    }
  } catch {
    return {
      descriptionShort: null,
      descriptionLong: null,
      story: null,
      philosophy: null,
      foundedYear: null,
      headquarters: null,
      familyOwned: null,
      certifications: [],
      websiteUrl: null,
    }
  }
}

export async function researchBrand(producerUrl: string): Promise<BrandResearchResult> {
  const warnings: string[] = []
  const pagesScanned: string[] = []

  // Normalize URL
  const cleanUrl = producerUrl.startsWith('http') ? producerUrl : `https://${producerUrl}`
  const baseUrl = new URL(cleanUrl).origin

  const homepage = await safeFetch(baseUrl)
  if (!homepage) {
    throw new Error(`Nelze načíst ${baseUrl} (timeout / 4xx / non-HTML)`)
  }
  const homePage = extractFromHtml(baseUrl, homepage)
  pagesScanned.push(baseUrl)

  // Try about pages — max 2 successful
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

  // Combined text for LLM
  const combinedText = [
    `URL: ${baseUrl}`,
    `Homepage meta: ${homePage.metaDescription ?? '(žádný)'}`,
    `Homepage text:\n${homePage.text.slice(0, 4000)}`,
    ...aboutPages.map(
      p => `\n--- ${p.url} ---\nMeta: ${p.metaDescription ?? '(žádný)'}\n${p.text.slice(0, 4000)}`
    ),
  ].join('\n')

  const extracted = await llmExtract(combinedText)

  // Logo: aggregate ze všech stránek, vyber nejlepší
  const allLogoUrls = [
    ...homePage.logoUrls,
    ...aboutPages.flatMap(p => p.logoUrls),
  ].map(u => resolveAbsolute(baseUrl, u))
  const logoUrl = pickBestLogo(allLogoUrls)

  if (!logoUrl) warnings.push('Logo nebylo nalezeno — žádný <img> s "logo" v src/alt.')

  return {
    ...extracted,
    websiteUrl: extracted.websiteUrl ?? baseUrl,
    logoUrl,
    pagesScanned,
    warnings,
  }
}
