import type { Element } from 'domhandler'
import type { ScanRule, Finding } from '../types'

// Only meaningful on listing pages
const LISTING_PATHS = ['/srovnavac', '/zebricek', '/pruvodce', '/recept']

function isListingUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname
    return LISTING_PATHS.some((p) => path.startsWith(p))
  } catch {
    return false
  }
}

export const duplicateNamesRule: ScanRule = {
  name: 'duplicate_name',
  async run(url, _html, $) {
    if (!isListingUrl(url)) return []

    // Use product slugs (from /olej/ links) as canonical identity — NOT text content.
    // Text-based detection on chips (origin, acidity, polyphenols) produces false positives
    // because multiple products from the same country share identical chip text.
    const slugToNames = new Map<string, string>()

    $('a[href^="/olej/"]').each((_: number, el: Element) => {
      const href = $(el).attr('href') ?? ''
      const slug = href.replace('/olej/', '').split('?')[0].split('#')[0]
      if (!slug || slug.length < 3) return
      // Collect product name from first heading/title-like child
      if (!slugToNames.has(slug)) {
        const name = $(el)
          .find('[class*="tracking-tight"], [class*="font-semibold"], h2, h3')
          .first()
          .text()
          .trim()
          .slice(0, 80)
        slugToNames.set(slug, name || slug)
      }
    })

    // Count how many times each slug link appears
    const slugCounts = new Map<string, number>()
    $('a[href^="/olej/"]').each((_: number, el: Element) => {
      const href = $(el).attr('href') ?? ''
      const slug = href.replace('/olej/', '').split('?')[0].split('#')[0]
      if (slug.length >= 3) slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1)
    })

    const findings: Finding[] = []
    // A product appearing 3+ times is suspicious (2× is normal: token + text link)
    for (const [slug, count] of slugCounts) {
      if (count < 3) continue
      const name = slugToNames.get(slug) ?? slug
      findings.push({
        findingType: 'duplicate_name',
        severity: 'medium',
        url,
        element: `a[href="/olej/${slug}"]`,
        detail: `Produkt "${name.slice(0, 60)}" se na stránce odkazuje ${count}× — pravděpodobně duplikát v article tokenech`,
        evidence: `slug: ${slug} | výskytů: ${count}`,
      })
    }

    return findings
  },
}
