// Prospector Agent — autonomously suggests new e-shops to admin.
//
// Sources (in priority order):
//  1. Curated list of known CZ specialty olive oil retailers
//  2. Heureka category scrape (TODO: requires Playwright due to Cloudflare)
//  3. Google Custom Search API (TODO: requires GOOGLE_CSE_API_KEY env)
//
// For each candidate domain:
//  - Check if already in discovery_sources (dedup)
//  - Test crawler — if works, mark as 'suggested' with URL count
//  - If fails, still mark as 'suggested' with last_scan_error
// Admin reviews suggestions in /admin/discovery/sources.

import { supabaseAdmin } from './supabase'
import { testCrawlerForDomain } from './shop-crawlers'

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

/** Run the Prospector — test curated candidates, add new ones as 'suggested'. */
export async function runProspector(): Promise<ProspectResult> {
  const result: ProspectResult = {
    totalCandidates: CURATED_CANDIDATES.length,
    alreadyKnown: 0,
    newlyAdded: 0,
    testedSuccess: 0,
    testedFailed: 0,
    added: [],
  }

  // Get existing domains from DB
  const { data: existing } = await supabaseAdmin
    .from('discovery_sources')
    .select('domain')
  const knownDomains = new Set(
    (existing ?? []).map(r => (r.domain as string).toLowerCase())
  )

  for (const candidate of CURATED_CANDIDATES) {
    const normalized = candidate.domain.toLowerCase()
    if (knownDomains.has(normalized)) {
      result.alreadyKnown++
      continue
    }

    // Test crawler — see if shop is reachable + parses
    const test = await testCrawlerForDomain(candidate.domain, {
      type: candidate.crawlerType === 'custom' ? 'shoptet_sitemap' : candidate.crawlerType,
      categoryUrl: candidate.categoryUrl,
    })

    const urlCount = test.urls.length
    const scanError: string | null = test.error ?? null

    if (urlCount > 0) {
      result.testedSuccess++
    } else {
      result.testedFailed++
      // Try alternate type
      if (candidate.crawlerType === 'shoptet_sitemap' && !candidate.categoryUrl) {
        // Maybe shop uses category-based instead. We don't know URL though, skip.
      }
    }

    // Slug from domain
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
        crawler_type: candidate.crawlerType === 'custom' ? 'shoptet_sitemap' : candidate.crawlerType,
        status: 'suggested',
        source: 'prospector_curated',
        reasoning: candidate.reasoning + (urlCount > 0 ? ` · ✓ test: ${urlCount} olejů` : ` · ✗ test selhal`),
        last_scan_url_count: urlCount,
        last_scan_error: scanError,
        last_scanned_at: new Date().toISOString(),
      })
      .select('id, domain, name')
      .single()

    if (!error && created) {
      result.newlyAdded++
      result.added.push({
        domain: created.domain as string,
        name: created.name as string ?? candidate.domain,
        urlsFound: urlCount,
        error: scanError ?? undefined,
      })
    }

    // Polite delay
    await new Promise(r => setTimeout(r, 1500))
  }

  return result
}
