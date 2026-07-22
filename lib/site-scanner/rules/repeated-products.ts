import type { Element } from 'cheerio'
import type { ScanRule, Finding } from '../types'

// Only meaningful on listing/collection pages
const LISTING_PATHS = ['/srovnavac', '/zebricek', '/pruvodce', '/recept']

function isListingUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname
    return LISTING_PATHS.some((p) => path.startsWith(p))
  } catch {
    return false
  }
}

export const repeatedProductsRule: ScanRule = {
  name: 'repeated_product',
  async run(url, _html, $) {
    if (!isListingUrl(url)) return []

    const findings: Finding[] = []
    const slugCounts = new Map<string, number>()

    // Collect all /olej/[slug] links
    $('a[href^="/olej/"]').each((_: number, el: Element) => {
      const href = $(el).attr('href') ?? ''
      const slug = href.replace('/olej/', '').split('?')[0].split('#')[0]
      if (!slug || slug.length < 3) return
      slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1)
    })

    for (const [slug, count] of slugCounts) {
      if (count < 3) continue
      findings.push({
        findingType: 'repeated_product',
        severity: 'low',
        url,
        element: `a[href="/olej/${slug}"]`,
        detail: `Produkt "${slug}" se na stránce objevuje ${count}×`,
        evidence: `Počet linků: ${count} — možná chyba v paginaci nebo filtrování`,
      })
    }

    return findings
  },
}
