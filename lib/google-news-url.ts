// Google News RSS vrací obálky news.google.com/rss/articles/<id>, ze kterých
// nejde stáhnout text článku. Starý formát id obsahuje URL v base64,
// nový jde přeložit jen přes interní batchexecute endpoint (data-n-a-sg/ts).

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const TIMEOUT_MS = 10_000

export function isGoogleNewsUrl(url: string): boolean {
  try {
    return new URL(url).hostname === 'news.google.com'
  } catch {
    return false
  }
}

function articleId(url: string): string | null {
  const m = new URL(url).pathname.match(/\/(?:rss\/)?articles\/([^/?#]+)/)
  return m ? m[1] : null
}

function decodeLegacy(id: string): string | null {
  try {
    const bytes = Buffer.from(id.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('latin1')
    if (bytes.includes('AU_yqL')) return null
    const m = bytes.match(/https?:\/\/[\x21-\x7e]+/)
    return m ? m[0].replace(/[\x00-\x1f\xd2].*$/, '') : null
  } catch {
    return null
  }
}

async function decodeViaBatchExecute(id: string): Promise<string | null> {
  const page = await fetch(`https://news.google.com/rss/articles/${id}`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!page.ok) return null
  const html = await page.text()
  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1]
  const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1]
  if (!sg || !ts) return null

  const inner = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`
  const res = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner]]])),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) return null
  const text = await res.text()
  const jsonLine = text.split('\n').find((l) => l.startsWith('[['))
  if (!jsonLine) return null
  const payload = JSON.parse(jsonLine)?.[0]?.[2]
  if (typeof payload !== 'string') return null
  const url = JSON.parse(payload)?.[1]
  return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null
}

// Olive Oil Times má překlady na /<lang>/<lang>/…; originál je anglická verze bez prefixu.
function canonicalArticleUrl(url: string): string {
  const u = new URL(url)
  if (u.hostname.endsWith('oliveoiltimes.com')) {
    u.pathname = u.pathname.replace(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/){1,2}/i, '/')
  }
  return u.toString()
}

/** Skutečná URL článku, nebo null — v tom případě položku zahodit, nehádat. */
export async function resolveGoogleNewsUrl(url: string): Promise<string | null> {
  if (!isGoogleNewsUrl(url)) return url
  const id = articleId(url)
  if (!id) return null
  const legacy = decodeLegacy(id)
  if (legacy && !isGoogleNewsUrl(legacy)) return canonicalArticleUrl(legacy)
  try {
    const resolved = await decodeViaBatchExecute(id)
    return resolved && !isGoogleNewsUrl(resolved) ? canonicalArticleUrl(resolved) : null
  } catch {
    return null
  }
}
