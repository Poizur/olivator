// Shop crawlers — find olive oil product URLs on supported e-shops.
// Each shop has a strategy: sitemap.xml parsing or category page scrape.
// Returns list of product URLs that look like olive oil.

import * as cheerio from 'cheerio'

export interface CrawlerResult {
  shopSlug: string
  shopDomain: string
  urls: string[]
  source: 'sitemap' | 'category' | 'unknown'
  fetchedAt: string
  error?: string
}

interface CrawlerConfig {
  slug: string
  domain: string
  type: 'shoptet_sitemap' | 'shoptet_category' | 'custom'
  // For category-based: URL of olive oil category
  categoryUrl?: string
  // Filename prefix patterns to filter olive oil products from full sitemap
  // (Shoptet sitemap contains ALL products from shop)
  productPathFilter?: RegExp
}

// Heuristic: a Shoptet URL is a PRODUCT (not category) when:
//   - path contains "olivov..-olej" or "panensk" (it's olive oil)
//   - path contains a volume marker: 250ml, 500ml, 0,5l, 1l, 5l, etc.
//   - path is NOT prefixed with /blog/, /znacka/, /vyrobci/ (non-product sections)
const PRODUCT_URL_HEURISTIC = (url: string): boolean => {
  if (!/olivov\w*-olej|extra-panensk|panensk\w-olej/i.test(url)) return false
  if (!/\d+[-_,.]?\d*(?:ml|l)\b/i.test(url)) return false
  if (/\/(blog|znacka|vyrobci|kategorie|sk|en)\//i.test(url)) return false
  return true
}

// Known shops — config-driven so admin can enable/disable in settings.
const CRAWLERS: Record<string, CrawlerConfig> = {
  reckonasbavi: {
    slug: 'reckonasbavi',
    domain: 'shop.reckonasbavi.cz',
    type: 'shoptet_sitemap',
    productPathFilter: undefined, // we use PRODUCT_URL_HEURISTIC instead
  },
  olivio: {
    slug: 'olivio',
    domain: 'olivio.cz',
    type: 'shoptet_sitemap',
  },
  gaea: {
    slug: 'gaea',
    domain: 'gaea.cz',
    type: 'shoptet_sitemap',
  },
  mujbio: {
    slug: 'mujbio',
    domain: 'mujbio.cz',
    type: 'shoptet_sitemap',
  },
  zdravasila: {
    slug: 'zdravasila',
    domain: 'zdravasila.cz',
    type: 'shoptet_sitemap',
  },
  olivovyolej: {
    slug: 'olivovyolej',
    domain: 'olivovyolej.cz',
    type: 'shoptet_sitemap',
  },
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; OlivatorBot/1.0; +https://olivator.cz/bot)',
  Accept: 'text/html,application/xhtml+xml,application/xml',
}

/** Parse Shoptet's typical sitemap.xml — returns olive oil product URLs.
 *  Uses heuristic that requires both a product noun ("olivový olej") AND
 *  a volume marker (1l, 500ml, …) in the URL path. */
async function crawlShoptetSitemap(config: CrawlerConfig): Promise<string[]> {
  // Some shops have sitemap_index.xml or sitemap.xml — try both
  const candidates = [
    `https://${config.domain}/sitemap.xml`,
    `https://${config.domain}/sitemap_index.xml`,
    `https://www.${config.domain}/sitemap.xml`,
  ]
  let xml: string | null = null
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15_000) })
      if (res.ok) { xml = await res.text(); break }
    } catch {
      // try next
    }
  }
  if (!xml) throw new Error('No sitemap found at known paths')

  const $ = cheerio.load(xml, { xmlMode: true })
  const urls = new Set<string>()
  const matchesFilter = (url: string) => {
    if (config.productPathFilter && !config.productPathFilter.test(url)) return false
    return PRODUCT_URL_HEURISTIC(url)
  }
  $('url > loc').each((_, el) => {
    const url = $(el).text().trim()
    if (url && matchesFilter(url)) urls.add(url)
  })

  // Follow nested sitemaps if present
  const sitemapIndexes: string[] = []
  $('sitemap > loc').each((_, el) => {
    const url = $(el).text().trim()
    if (url) sitemapIndexes.push(url)
  })
  for (const subUrl of sitemapIndexes.slice(0, 5)) {
    try {
      const subRes = await fetch(subUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10_000) })
      if (!subRes.ok) continue
      const subXml = await subRes.text()
      const $sub = cheerio.load(subXml, { xmlMode: true })
      $sub('url > loc').each((_, el) => {
        const url = $sub(el).text().trim()
        if (url && matchesFilter(url)) urls.add(url)
      })
    } catch {
      // skip
    }
  }

  return [...urls]
}

/** Scrape a Shoptet category page for product links.
 *  Shoptet has a strict structure: each product card is a <div class="product">
 *  with an <a class="image"> or <a class="name"> linking to the detail.
 *  We use ONLY .product container scope to avoid anchor / category / external links. */
async function crawlShoptetCategory(config: CrawlerConfig): Promise<string[]> {
  if (!config.categoryUrl) throw new Error('categoryUrl missing')
  const baseUrl = config.categoryUrl
  const baseDomain = new URL(baseUrl).hostname

  const allUrls = new Set<string>()
  for (let page = 1; page <= 5; page++) {
    const pageUrl = page === 1 ? baseUrl : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${page}`
    try {
      const res = await fetch(pageUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15_000) })
      if (!res.ok) break
      const html = await res.text()
      const $ = cheerio.load(html)

      let foundOnPage = 0
      // Scoped: find product cards first, then take their links
      // Shoptet variants: .product, .product-item, .p, .product-list-item
      const productCards = $('.product, .product-item, .product-list-item, [class*="product-box"]')
      productCards.each((_, card) => {
        // Take the most reliable link inside the card
        const link =
          $(card).find('a.name, a.product-name, h2 > a, h3 > a, a.image, .image > a').first()
        const href = link.attr('href')
        if (!href) return
        let absolute: string
        try {
          absolute = new URL(href, baseUrl).toString()
        } catch {
          return
        }
        const url = new URL(absolute)
        // Stay on same domain
        if (url.hostname !== baseDomain) return
        // Reject anchors
        if (url.hash) return
        // Reject query-string filtered listings
        if (url.search) return
        // Reject the category URL itself
        if (url.pathname === new URL(baseUrl).pathname) return
        // Path must look like product slug, not category — heuristic: contains hyphens + length > 15
        if (url.pathname.length < 15) return
        // Exclude obvious category/listing patterns
        if (/\/c\/|\/category|\/kategorie|\/oleje$|\/all|\/vyrobci/.test(url.pathname)) return

        if (!allUrls.has(absolute)) {
          allUrls.add(absolute)
          foundOnPage++
        }
      })

      if (foundOnPage === 0) break
    } catch {
      break
    }
  }

  return [...allUrls]
}

/** Main entrypoint — crawl one configured shop, return product URLs. */
export async function crawlShop(slug: string): Promise<CrawlerResult> {
  const config = CRAWLERS[slug]
  if (!config) {
    return {
      shopSlug: slug,
      shopDomain: 'unknown',
      urls: [],
      source: 'unknown',
      fetchedAt: new Date().toISOString(),
      error: `No crawler config for shop "${slug}"`,
    }
  }

  try {
    let urls: string[] = []
    let source: 'sitemap' | 'category' = 'category'

    if (config.type === 'shoptet_sitemap') {
      urls = await crawlShoptetSitemap(config)
      source = 'sitemap'
    } else if (config.type === 'shoptet_category') {
      urls = await crawlShoptetCategory(config)
      source = 'category'
    }

    return {
      shopSlug: slug,
      shopDomain: config.domain,
      urls,
      source,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      shopSlug: slug,
      shopDomain: config.domain,
      urls: [],
      source: config.type === 'shoptet_sitemap' ? 'sitemap' : 'category',
      fetchedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Crawler failed',
    }
  }
}

/** Crawl multiple shops in sequence (avoids rate limit issues). */
export async function crawlShops(slugs: string[]): Promise<CrawlerResult[]> {
  const results: CrawlerResult[] = []
  for (const slug of slugs) {
    results.push(await crawlShop(slug))
    // Be polite — 2 sec delay between shops
    if (slugs.length > 1) await new Promise(r => setTimeout(r, 2000))
  }
  return results
}

export function getKnownShopSlugs(): string[] {
  return Object.keys(CRAWLERS)
}
