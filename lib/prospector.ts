// Prospector Agent — autonomně navrhuje nové e-shopy adminovi.
//
// Strategie:
//  1. Claude API navrhne 20-30 kandidátů (aktuální tržní přehled)
//  2. Curated list jako safety net (manuálně udržovaný)
//  3. Pro každého kandidáta: dedup → crawler test → DB save
//
// DB výsledky:
//  - Crawler test PROŠEL → status='suggested' (admin vidí jako návrh)
//  - Crawler test SELHAL → status='rejected' (v DB pro dedup, neviditelné v UI)
//
// Admin reviewuje v /admin/discovery/sources. Když smaže suggestion, jde do
// 'rejected' (soft delete) — prospector už nikdy znovu nenavrhne.

import { supabaseAdmin } from './supabase'
import { testCrawlerForDomain } from './shop-crawlers'
import { discoverCandidatesViaClaude } from './claude-prospector'

interface ProspectCandidate {
  domain: string
  name: string
  source: string
  reasoning: string
  crawlerType: 'shoptet_sitemap' | 'shoptet_category' | 'custom'
  categoryUrl?: string
}

/** Curated list of known CZ olive oil specialty retailers + relevant general
 *  e-shops. This is hand-maintained — add/remove based on knowledge of the market.
 *  Each candidate gets tested by crawler before being added as 'suggested'. */
const CURATED_CANDIDATES: ProspectCandidate[] = [
  // Specialty olive oil shops (CZ)
  { domain: 'olivovyolej.cz', name: 'Olivovyolej.cz', source: 'curated', reasoning: 'Specialty CZ shop pro olivový olej', crawlerType: 'shoptet_sitemap' },
  { domain: 'kvalitniolivovyolej.cz', name: 'Kvalitní olivový olej', source: 'curated', reasoning: 'Specialty CZ shop', crawlerType: 'shoptet_sitemap' },
  { domain: 'olivolio.cz', name: 'Olivolio', source: 'curated', reasoning: 'Specialty olive oil retailer', crawlerType: 'shoptet_sitemap' },
  { domain: 'recky-olivovy-olej.cz', name: 'Řecký olivový olej', source: 'curated', reasoning: 'Specialty řecký shop', crawlerType: 'shoptet_sitemap' },
  { domain: 'fresharia.cz', name: 'Fresharia', source: 'curated', reasoning: 'Mediterranean specialty shop', crawlerType: 'shoptet_sitemap' },
  { domain: 'olivigo.cz', name: 'Olivigo', source: 'curated', reasoning: 'Olive products specialty', crawlerType: 'shoptet_sitemap' },
  { domain: 'olivove-oleje.cz', name: 'Olivové oleje', source: 'curated', reasoning: 'Specialty olive oil shop', crawlerType: 'shoptet_sitemap' },
  { domain: 'gourmet-delica.cz', name: 'Gourmet Delica', source: 'curated', reasoning: 'Mediterranean gourmet specialty', crawlerType: 'shoptet_sitemap' },
  { domain: 'olejolivy.cz', name: 'Oleje a olivy', source: 'curated', reasoning: 'Specialty oils shop', crawlerType: 'shoptet_sitemap' },
  { domain: 'olivat.cz', name: 'Olivat', source: 'curated', reasoning: 'Olive oil specialty', crawlerType: 'shoptet_sitemap' },

  // Greek / Italian importers
  { domain: 'reckydumovy.cz', name: 'Řecký domov', source: 'curated', reasoning: 'Řecké speciality', crawlerType: 'shoptet_sitemap' },
  { domain: 'kalamatas.cz', name: 'Kalamatas', source: 'curated', reasoning: 'Greek oil specialty', crawlerType: 'shoptet_sitemap' },
  { domain: 'eshop-olivovyolej.cz', name: 'E-shop Olivový Olej', source: 'curated', reasoning: 'Specialty shop', crawlerType: 'shoptet_sitemap' },

  // General CZ e-shops with olive oil categories (lower priority)
  { domain: 'rohlik.cz', name: 'Rohlík.cz', source: 'curated', reasoning: 'Mainstream CZ grocery — high volume but mass market', crawlerType: 'custom' },
  { domain: 'kosik.cz', name: 'Košík.cz', source: 'curated', reasoning: 'Mainstream CZ grocery', crawlerType: 'custom' },
]

export interface ProspectResult {
  totalCandidates: number
  alreadyKnown: number
  newlyAdded: number
  testedSuccess: number
  testedFailed: number
  added: Array<{
    domain: string
    name: string
    urlsFound: number
    error?: string
  }>
}

interface UnifiedCandidate {
  domain: string
  name: string
  reasoning: string
  source: 'prospector_curated' | 'prospector_claude'
}

/** Run the Prospector — Claude AI návrhy + curated safety net.
 *  Každý kandidát: dedup → crawler test → DB save. */
export async function runProspector(): Promise<ProspectResult> {
  // 1. Načti existující domény z DB (jakýkoli status — i rejected!)
  //    Důvod: rejected = admin nebo prospector už řekl "ne", neopakovat.
  const { data: existing } = await supabaseAdmin
    .from('discovery_sources')
    .select('domain')
  const knownDomains = new Set(
    (existing ?? []).map((r) => (r.domain as string).toLowerCase())
  )

  // 2. Claude prospector — primární zdroj
  const claudeCandidates = await discoverCandidatesViaClaude(
    Array.from(knownDomains)
  )

  // 3. Sjednoť s curated listem (curated jako fallback safety net)
  const candidates: UnifiedCandidate[] = []
  for (const c of claudeCandidates) {
    candidates.push({
      domain: c.domain,
      name: c.name,
      reasoning: c.reasoning,
      source: 'prospector_claude',
    })
  }
  for (const c of CURATED_CANDIDATES) {
    if (c.crawlerType === 'custom') continue // mainstream grocers — řeší se separátně
    // Dedupe proti Claude návrhům
    if (candidates.some((x) => x.domain.toLowerCase() === c.domain.toLowerCase())) continue
    candidates.push({
      domain: c.domain,
      name: c.name,
      reasoning: c.reasoning,
      source: 'prospector_curated',
    })
  }

  const result: ProspectResult = {
    totalCandidates: candidates.length,
    alreadyKnown: 0,
    newlyAdded: 0,
    testedSuccess: 0,
    testedFailed: 0,
    added: [],
  }

  // 4. Pro každého kandidáta: dedup → test → save
  for (const candidate of candidates) {
    const normalized = candidate.domain.toLowerCase()
    if (knownDomains.has(normalized)) {
      result.alreadyKnown++
      continue
    }

    // Crawler test — pokus o sitemap. URL count = počet URL co prošly
    // PRODUCT_URL_HEURISTIC (musí obsahovat "olivov-olej" + volume marker).
    const test = await testCrawlerForDomain(candidate.domain, { type: 'shoptet_sitemap' })
    const urlCount = test.urls.length
    const scanError: string | null = test.error ?? null

    // Threshold pro "real specialty shop": min 3 olive oil produkty.
    // 1-2 olejů = generic shop co má jen pár položek; nezajímavý pro nás.
    // 3+ = signál že shop má reálnou kategorii / sortiment.
    const MIN_OLIVE_URLS = 3

    if (urlCount >= MIN_OLIVE_URLS) result.testedSuccess++
    else result.testedFailed++

    const newStatus = urlCount >= MIN_OLIVE_URLS ? 'suggested' : 'rejected'
    const failReason =
      urlCount === 0
        ? 'crawler test selhal — sitemap nenalezena nebo žádné olive oil URL'
        : `pouze ${urlCount} olive oil URL (threshold: ${MIN_OLIVE_URLS})`

    // Slug z domény
    const slug = candidate.domain
      .replace(/^(shop\.|m\.|www\.)/, '')
      .split('.')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

    const { data: created, error } = await supabaseAdmin
      .from('discovery_sources')
      .insert({
        domain: candidate.domain,
        slug,
        name: candidate.name,
        crawler_type: 'shoptet_sitemap',
        status: newStatus,
        source: candidate.source,
        reasoning:
          candidate.reasoning +
          (urlCount >= MIN_OLIVE_URLS
            ? ` · ✓ test: ${urlCount} olejů v sitemap`
            : ` · ${failReason}`),
        last_scan_url_count: urlCount,
        last_scan_error: scanError,
        last_scanned_at: new Date().toISOString(),
      })
      .select('id, domain, name')
      .single()

    if (!error && created && urlCount >= MIN_OLIVE_URLS) {
      result.newlyAdded++
      result.added.push({
        domain: created.domain as string,
        name: (created.name as string) ?? candidate.domain,
        urlsFound: urlCount,
        error: scanError ?? undefined,
      })
    }

    // Přidej do knownDomains aby Claude+curated overlap nezpůsobil dvojitý insert
    knownDomains.add(normalized)

    // Polite delay
    await new Promise((r) => setTimeout(r, 1200))
  }

  return result
}
