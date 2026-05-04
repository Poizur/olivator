// RSS feed fetcher pro Olivator Radar.
// Načte XML z URL, parse přes cheerio, vrátí standardizované items.

import { load } from 'cheerio'

export interface RssItem {
  source: string
  title: string
  url: string
  description: string
  pubDate: Date | null
  freshness: number  // 0-100, vyšší = čerstvější
}

const FETCH_TIMEOUT_MS = 10000
const ITEM_LIMIT_PER_FEED = 20

/** Olive oil press — adaptováno z AIkompass _AI_NEWS_FEEDS pro doménu. */
export const OLIVE_NEWS_FEEDS: ReadonlyArray<{ source: string; url: string }> = [
  { source: 'oliveoiltimes',    url: 'https://www.oliveoiltimes.com/feed' },
  { source: 'ioc',              url: 'https://www.internationaloliveoil.org/feed/' },
  { source: 'evooworld',        url: 'https://www.evooworld.com/feed/' },
  { source: 'googlenews_olive', url: 'https://news.google.com/rss/search?q=olive+oil+harvest+production+EVOO&hl=en&gl=US&ceid=US:en' },
  { source: 'googlenews_cz',    url: 'https://news.google.com/rss/search?q=olivov%C3%BD+olej+cena+sklize%C5%88&hl=cs&gl=CZ&ceid=CZ:cs' },
]

function parsePubDate(text: string): Date | null {
  if (!text) return null
  const cleaned = text.trim()
  // RFC822 (`Wed, 30 Apr 2026 10:00:00 +0000`) — Date konstruktor to umí
  const d = new Date(cleaned)
  return isNaN(d.getTime()) ? null : d
}

function htmlToText(html: string): string {
  if (!html) return ''
  // Strip tags + decode entities přes cheerio (text())
  const $ = load(`<root>${html}</root>`)
  return $('root').text().replace(/\s+/g, ' ').trim().slice(0, 300)
}

async function fetchFeed(source: string, url: string, cutoff: Date): Promise<RssItem[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'OlivatorBot/1.0 (+https://olivator.cz)',
        Accept: 'application/rss+xml,application/xml,text/xml',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!resp.ok) {
      console.warn(`[rss] ${source}: HTTP ${resp.status}`)
      return []
    }
    const xml = await resp.text()
    const $ = load(xml, { xmlMode: true })

    const items: RssItem[] = []
    const $items = $('item').slice(0, ITEM_LIMIT_PER_FEED)
    $items.each((_idx, el) => {
      const $el = $(el)
      const title = $el.find('title').first().text().trim()
      if (!title) return
      const link = $el.find('link').first().text().trim()
      if (!link) return
      const descRaw = $el.find('description').first().text() ?? ''
      const description = htmlToText(descRaw)
      const pubText = $el.find('pubDate').first().text() ?? ''
      const pubDate = parsePubDate(pubText)

      // Skip items older than cutoff (filter v rámci feedu)
      if (pubDate && pubDate < cutoff) return

      // Freshness 0-100 podle stáří (newer = vyšší)
      let freshness = 40
      if (pubDate) {
        const ageHours = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60)
        freshness = Math.max(10, Math.min(100, Math.round(100 - ageHours * 4)))
      }

      items.push({ source, title, url: link, description, pubDate, freshness })
    })
    return items
  } catch (err) {
    console.warn(`[rss] ${source} fetch failed:`, err instanceof Error ? err.message : err)
    return []
  }
}

/** Stáhne všechny olivové RSS feedy paralelně (s 0.3s delay mezi spuštěním
 *  aby žádný host nedostal burst). Vrátí položky novější než `hoursBack`. */
export async function fetchAllOliveFeeds(hoursBack: number): Promise<RssItem[]> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
  const all: RssItem[] = []

  for (const { source, url } of OLIVE_NEWS_FEEDS) {
    const items = await fetchFeed(source, url, cutoff)
    all.push(...items)
    // Polite delay mezi feedy
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`[rss] fetched ${all.length} items from ${OLIVE_NEWS_FEEDS.length} feeds`)
  return all
}
