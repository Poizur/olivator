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
  /** Atmosférické fotky z webu výrobce — pan Intini, výroba, hájem, balení.
   *  Až 8 nejvhodnějších URL — orchestrátor je uloží do entity_images
   *  s role='gallery'. */
  galleryUrls: string[]
  pagesScanned: string[]
  warnings: string[]
}

// "O nás" + galerie + produkty stránky pro typické olivářské weby
// (italsky, řecky, anglicky, česky). Cílem je sebrat 30+ unikátních fotek
// — proto i /galleria, /prodotti, /products atd.
const ABOUT_PATHS = [
  // English
  '/about',
  '/about-us',
  '/our-story',
  '/our-history',
  '/heritage',
  '/family',
  '/the-family',
  '/gallery',
  '/photos',
  '/products',
  '/our-oils',
  '/the-mill',
  '/farming',
  '/harvest',
  // Italian
  '/azienda',
  '/chi-siamo',
  '/storia',
  '/la-famiglia',
  '/galleria',
  '/prodotti',
  '/oli',
  '/il-frantoio',
  '/raccolta',
  '/uliveti',
  // Greek
  '/etairia',
  '/προϊοντα',
  // Czech / Slovak
  '/o-nas',
  '/onas',
  '/historie',
  '/produkty',
  '/galerie',
  // Multilingual prefixes
  '/en/about',
  '/en/history',
  '/en/gallery',
  '/en/products',
  '/it/azienda',
  '/it/galleria',
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
  /** Velké atmosférické fotky — kandidáti pro brand gallery (zakladatel,
   *  výroba, hájem, lahve). Na rozdíl od loga: object-cover, landscape. */
  galleryUrls: string[]
  metaDescription: string | null
}

const LOGO_SELECTORS = [
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

// Negativní filtr pro gallery — vyhodit ikonky, sociální badge, sprite, pixel.
const GALLERY_BAD_PATTERNS = [
  /logo/i,
  /icon/i,
  /favicon/i,
  /sprite/i,
  /pixel/i,
  /tracking/i,
  /\/cart/i,
  /social/i,
  /facebook|instagram|twitter|youtube|linkedin/i,
  /\.svg(\?|$)/i, // SVG bývá ikona, ne fotka
  /badge/i,
  /flag/i,
  /payment/i,
]

function isGalleryCandidate(src: string, alt: string | undefined, width: string | undefined, height: string | undefined): boolean {
  if (src.startsWith('data:')) return false
  for (const re of GALLERY_BAD_PATTERNS) {
    if (re.test(src)) return false
    if (alt && re.test(alt)) return false
  }
  // Pokud má atribut width/height a obojí < 200, skip (thumbnail/icon)
  const w = Number(width)
  const h = Number(height)
  if (!isNaN(w) && w > 0 && w < 200) return false
  if (!isNaN(h) && h > 0 && h < 200) return false
  // URL musí vést na typický asset/uploads cestu nebo na /wp-content/, /media/
  return /\/(uploads|media|images|wp-content|content|assets|cdn|static)\//i.test(src) || src.length > 30
}

function extractFromHtml(url: string, html: string): ScrapedPage {
  const $ = load(html)
  // SVG odstranit — inline SVG path stringy / titles znečišťují body text
  // a Claude Haiku pak extrahuje míň reálných dat (verify pak rejectne).
  $('script, style, noscript, iframe, svg').remove()

  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)

  const metaDescription =
    $('meta[name="description"]').attr('content') ??
    $('meta[property="og:description"]').attr('content') ??
    null

  // Logo kandidáti
  const logoUrls: string[] = []
  for (const sel of LOGO_SELECTORS) {
    $(sel).each((_, el) => {
      const src = $(el).attr('src') ?? $(el).attr('data-src') ?? $(el).attr('data-lazy-src')
      if (src) logoUrls.push(src)
    })
  }
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) logoUrls.push(ogImage)

  // Gallery kandidáti — všechny <img> co prošly filtrem + nejsou v hlavičce
  const galleryUrls: string[] = []
  const seen = new Set<string>()
  $('img').each((_, el) => {
    // Skip <img> uvnitř <header> nebo .site-header / .navbar
    const inHeader = $(el).closest('header, .site-header, .navbar, .menu, footer, .footer').length > 0
    if (inHeader) return
    const src = $(el).attr('src') ?? $(el).attr('data-src') ?? $(el).attr('data-lazy-src') ?? $(el).attr('data-original')
    if (!src) return
    const alt = $(el).attr('alt')
    const w = $(el).attr('width')
    const h = $(el).attr('height')
    if (!isGalleryCandidate(src, alt, w, h)) return
    if (seen.has(src)) return
    seen.add(src)
    galleryUrls.push(src)
  })

  return { url, text, logoUrls, galleryUrls, metaDescription }
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

  // Crawl about/gallery pages + nav links z homepage. Cílem je sebrat 30+
  // unikátních fotek + bohatý text. Limit ~10 stránek aby to nešlo navždy.
  const MAX_PAGES = 10
  const aboutPages: ScrapedPage[] = []
  const visitedUrls = new Set<string>([baseUrl])

  // 1. Zkus známé "about/gallery" cesty
  for (const path of ABOUT_PATHS) {
    if (aboutPages.length >= MAX_PAGES - 1) break
    const url = `${baseUrl}${path}`
    if (visitedUrls.has(url)) continue
    visitedUrls.add(url)
    const html = await safeFetch(url)
    if (html) {
      aboutPages.push(extractFromHtml(url, html))
      pagesScanned.push(url)
    }
  }

  // 2. Pokud máme méně než 5 stránek, vytáhni interní <a href> z homepage
  //    a zkus je (filter: nesmí být fragment, query-only, jiná doména,
  //    soubor pdf/docx/zip).
  if (aboutPages.length < MAX_PAGES - 1) {
    const $home = load(homepage)
    const navLinks: string[] = []
    $home('a[href]').each((_, el) => {
      const href = $home(el).attr('href')
      if (!href) return
      try {
        const abs = new URL(href, baseUrl)
        if (abs.origin !== baseUrl) return
        if (/\.(pdf|docx|zip|rar|mp4|mp3)(\?|$)/i.test(abs.pathname)) return
        if (abs.pathname === '/' || abs.pathname === '') return
        const cleaned = `${abs.origin}${abs.pathname}`
        if (!visitedUrls.has(cleaned)) {
          navLinks.push(cleaned)
          visitedUrls.add(cleaned)
        }
      } catch {
        /* skip */
      }
    })

    for (const link of navLinks) {
      if (aboutPages.length >= MAX_PAGES - 1) break
      const html = await safeFetch(link)
      if (html) {
        aboutPages.push(extractFromHtml(link, html))
        pagesScanned.push(link)
      }
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
    ...aboutPages.flatMap((p) => p.logoUrls),
  ].map((u) => resolveAbsolute(baseUrl, u))
  const logoUrl = pickBestLogo(allLogoUrls)

  if (!logoUrl) warnings.push('Logo nebylo nalezeno — žádný <img> s "logo" v src/alt.')

  // Gallery: aggregate, dedup, vyfiltruj logo URLs (i jejich varianty bez query)
  const logoBases = new Set([logoUrl, ...allLogoUrls].filter(Boolean).map((u) => u!.split('?')[0]))
  const allGalleryRaw = [
    ...homePage.galleryUrls,
    ...aboutPages.flatMap((p) => p.galleryUrls),
  ].map((u) => resolveAbsolute(baseUrl, u))

  const seen = new Set<string>()
  const galleryUrls: string[] = []
  for (const url of allGalleryRaw) {
    const base = url.split('?')[0]
    if (logoBases.has(base)) continue
    if (seen.has(base)) continue
    seen.add(base)
    galleryUrls.push(url)
    if (galleryUrls.length >= 30) break
  }

  if (galleryUrls.length === 0) {
    warnings.push('Žádné atmosférické fotky nebyly nalezeny — galerie zůstane prázdná.')
  }

  // Auto-extrakce galerie BYLA vypnutá záměrně — fotky z webu výrobce mívají
  // špatné poměry stran, hotlink protection, nehodící se obsah. Admin nahrává
  // fotky ručně přes section-based UI v adminu. Logo z homepage zůstává.
  return {
    ...extracted,
    websiteUrl: extracted.websiteUrl ?? baseUrl,
    logoUrl,
    galleryUrls: [],
    pagesScanned,
    warnings,
  }
}
