// Coverage check — porovná počet olejů v XML feedu retailera vs počet
// produktů na webu eshopu. Smyslem je odhalit BUG-024 (CLAUDE.md sekce 21):
// XML feed nemusí pokrývat všechny kategorie eshopu.
//
// Workflow:
//   1. Fetch XML feed → count items přes isOliveOil()
//   2. Heuristika web URL — zkusí běžné cesty (/olivove-oleje, /oleje, ...)
//   3. Cheerio parse → count product cards (Shoptet + PrestaShop selektory)
//   4. Vrátí diff + warning pokud >20% rozdíl

import { load } from 'cheerio'
import { fetchHeurekaFeed, isOliveOil } from './heureka-feed-parser'

export interface CoverageReport {
  retailerSlug: string
  domain: string
  feedUrl: string | null
  feedOilsCount: number
  webPathsTried: string[]
  webPathsFound: { path: string; productCount: number }[]
  webOilsTotal: number
  diffPct: number  // (web - feed) / web × 100, vyšší = víc na webu než ve feedu
  status: 'ok' | 'warn' | 'critical' | 'no_feed' | 'error'
  message: string
}

const COMMON_OIL_PATHS = [
  '/olivove-oleje/',
  '/olivovy-olej/',
  '/oleje/',
  '/extra-panensky-olivovy-olej/',
  '/bio-extra-panensky-olivovy-olej/',
  '/cs/13-olivovy-olej',  // PrestaShop pattern
  '/cs/olivovy-olej',
  '/kategorie/olivove-oleje/',
  '/kategorie/oleje/',
]

const FETCH_HEADERS = {
  'User-Agent': 'OlivatorBot/1.0 (+https://olivator.cz)',
  Accept: 'text/html',
}

const PRODUCT_SELECTORS = [
  '.product',
  '.product-item',
  '.product-list-item',
  '[class*="product-box"]',
  '.product-miniature',
  '.product-container',
  'article[data-id-product]',
  '[data-product-id]',
].join(', ')

async function countWebProducts(domain: string, path: string): Promise<number> {
  const url = `https://${domain}${path}`
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return 0
    const html = await res.text()
    const $ = load(html)
    return $(PRODUCT_SELECTORS).length
  } catch {
    return 0
  }
}

export async function checkRetailerCoverage(retailer: {
  slug: string
  domain: string
  xmlFeedUrl: string | null
}): Promise<CoverageReport> {
  const report: CoverageReport = {
    retailerSlug: retailer.slug,
    domain: retailer.domain,
    feedUrl: retailer.xmlFeedUrl,
    feedOilsCount: 0,
    webPathsTried: [],
    webPathsFound: [],
    webOilsTotal: 0,
    diffPct: 0,
    status: 'ok',
    message: '',
  }

  // 1. Spočítat oleje ve feedu (pokud existuje)
  if (retailer.xmlFeedUrl) {
    try {
      const items = await fetchHeurekaFeed(retailer.xmlFeedUrl)
      report.feedOilsCount = items.filter(isOliveOil).length
    } catch (err) {
      report.status = 'error'
      report.message = `XML feed fetch failed: ${err instanceof Error ? err.message : err}`
      return report
    }
  } else {
    report.status = 'no_feed'
    report.message = 'Retailer nemá XML feed — nemůžu porovnat coverage.'
    return report
  }

  // 2. Najít web kategorie (try common paths)
  for (const path of COMMON_OIL_PATHS) {
    report.webPathsTried.push(path)
    const count = await countWebProducts(retailer.domain, path)
    if (count > 3) {
      // > 3 abychom skipnuli stránky s navigací co náhodou matchnou selektor
      report.webPathsFound.push({ path, productCount: count })
    }
    await new Promise((r) => setTimeout(r, 300))  // polite delay
  }

  if (report.webPathsFound.length === 0) {
    report.status = 'warn'
    report.message = 'Žádná známá olej kategorie nenalezena. Buď eshop má jiné URL pattern, nebo nemá olej.'
    return report
  }

  // Sečíst ALE deduplikovat — pokud má eshop /oleje/ a /extra-panensky-olivovy-olej/
  // jako rodičovskou+dceřinou, mohly by se počítat 2×. Pro MVP bereme MAX z paths
  // (largest category obvykle obsahuje vše).
  report.webOilsTotal = Math.max(...report.webPathsFound.map((p) => p.productCount))

  // 3. Spočítat diff
  if (report.feedOilsCount === 0 && report.webOilsTotal > 0) {
    report.status = 'critical'
    report.message = `Feed nemá žádné oleje, web má ~${report.webOilsTotal}. Použij discovery agent místo XML.`
    report.diffPct = 100
  } else if (report.webOilsTotal > 0) {
    report.diffPct = Math.round(((report.webOilsTotal - report.feedOilsCount) / report.webOilsTotal) * 100)
    if (report.diffPct > 50) {
      report.status = 'critical'
      report.message = `Feed má ${report.feedOilsCount}, web má ~${report.webOilsTotal} (${report.diffPct}% chybí). Doporučeno přepnout na discovery.`
    } else if (report.diffPct > 20) {
      report.status = 'warn'
      report.message = `Feed má ${report.feedOilsCount}, web má ~${report.webOilsTotal} (${report.diffPct}% chybí). Sledovat.`
    } else {
      report.status = 'ok'
      report.message = `Feed pokrývá ${report.feedOilsCount}/${report.webOilsTotal} (${100 - report.diffPct}% web obsahu).`
    }
  }

  return report
}
