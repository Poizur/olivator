// Fetcher pro originální article HTML — best effort, s timeoutem.
// Použije browser UA aby Cloudflare/bot-protection nezablokoval.
//
// Pro radar agent: stáhne HTML, vytáhne main content přes cheerio,
// vrátí ~3000 znaků čistého textu pro Claude prompt. Selhání = null,
// agent pak fallbackuje na RSS title + description.

import { load } from 'cheerio'

const FETCH_TIMEOUT_MS = 8000
const MAX_TEXT_CHARS = 4000

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Selektory které tipicky obsahují main article content. První match vyhrává.
const ARTICLE_SELECTORS = [
  'article',
  'main article',
  '[role="main"] article',
  '.article-body',
  '.post-content',
  '.entry-content',
  '#article-body',
  'main',
]

export async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const html = await res.text()
    return extractMainText(html)
  } catch {
    return null
  }
}

function extractMainText(html: string): string {
  const $ = load(html)

  $('script, style, nav, header, footer, aside, form, iframe, noscript').remove()
  $('.advertisement, .ads, .ad, .related, .sidebar, .comments').remove()

  let text = ''
  for (const sel of ARTICLE_SELECTORS) {
    const $el = $(sel).first()
    if ($el.length) {
      text = $el.text()
      if (text.length > 500) break
    }
  }

  if (!text || text.length < 500) {
    text = $('body').text()
  }

  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_CHARS)
}
