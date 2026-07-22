import type { Element } from 'cheerio'
import type { ScanRule, Finding } from '../types'

// Only check on pages where retailer logos are expected (product detail with price table)
const DETAIL_PATH = '/olej/'

export const missingLogoRule: ScanRule = {
  name: 'missing_logo',
  async run(url, _html, $) {
    const findings: Finding[] = []
    const isDetail = url.includes(DETAIL_PATH)

    // Header logo — check on every page
    const headerLogo = $('header img, [class*="logo"] img, nav img').first()
    if (headerLogo.length) {
      const src = headerLogo.attr('src') ?? ''
      const alt = headerLogo.attr('alt') ?? ''
      if (!src || src === '#' || src.includes('undefined')) {
        findings.push({
          findingType: 'missing_logo',
          severity: 'high',
          url,
          element: 'header img',
          detail: `Hlavní logo webu má neplatný src`,
          evidence: `alt="${alt}" src="${src}"`,
        })
      }
    }

    // Retailer logos in price table (only on product detail pages)
    if (isDetail) {
      $('[class*="retailer"] img, [class*="shop"] img, [class*="store"] img').each((_: number, el: Element) => {
        const src = $(el).attr('src') ?? ''
        const alt = $(el).attr('alt') ?? ''
        if (!src || src === '#' || src.includes('undefined')) {
          findings.push({
            findingType: 'missing_logo',
            severity: 'medium',
            url,
            element: `img[alt="${alt}"]`,
            detail: `Logo prodejce "${alt || 'neznámý'}" má neplatný src v ceníku`,
            evidence: `src="${src}"`,
          })
        }
      })
    }

    return findings
  },
}
