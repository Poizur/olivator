// Rozhodnutí, kam /go/ přesměruje a jak klik uložit. Čistá funkce (čas jako parametr),
// aby šly obě větve konce affiliate programu otestovat simulovaným časem.

export const RATE_LIMIT_PER_MIN = 5

export interface GoRetailer {
  domain: string | null
  base_tracking_url: string | null
  affiliate_network: string | null
  affiliate_ends_at: string | null
}

export interface GoOffer {
  affiliate_url: string | null
  product_url: string | null
}

export interface GoContext {
  now: Date
  userAgent: string
  hasOrigin: boolean
  recentClicksFromIp: number
  testHeader: boolean
  productSlug: string
  ean: string | null
}

export type GoMode = 'affiliate' | 'direct_bot' | 'direct_affiliate_ended' | 'direct_no_network'

export interface GoDecision {
  target: string | null
  mode: GoMode
  isTest: boolean
  unverified: boolean
  botReason: string | null
}

export function safeParseUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null
  } catch {
    return null
  }
}

// Prodejce bez affiliate sítě vidí náš traffic jen přes UTM v GA4. Přidáváme je až tady,
// aby je feed-sync přepsáním product_url nesmazal.
export function withReferralUtm(raw: string): string {
  const u = new URL(raw)
  if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'olivator')
  if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'referral')
  return u.toString()
}

const BOT_WORDS = /bot|crawler|spider|jscrawler|meta-webindexer|semrush|ahref|olivatortest/i
const HEADLESS = /headless|phantomjs|puppeteer|playwright|selenium|python-requests|python-urllib|aiohttp|go-http-client|axios|node-fetch|undici|okhttp|java\/|libwww|wget|httpclient|scrapy/i
// Zastaralé verze, které reální návštěvníci v datech od 9/2026 nepoužívají (iOS 13.2.3, Chrome 142 bez původu).
const MAX_OUTDATED_IOS = 14
const MIN_CURRENT_CHROME = 120
const MAX_SUSPICIOUS_CHROME_WITHOUT_ORIGIN = 142

export function botReason(userAgent: string, hasOrigin: boolean, testHeader = false): string | null {
  const ua = userAgent.trim()
  if (testHeader) return 'test header'
  if (!ua || ua === 'node' || ua.startsWith('curl/')) return 'bez prohlížeče'
  if (BOT_WORDS.test(ua)) return 'bot v user-agentu'
  if (HEADLESS.test(ua)) return 'headless / knihovna'
  const ios = ua.match(/(?:iPhone|CPU) OS (\d+)_/)
  if (ios && Number(ios[1]) <= MAX_OUTDATED_IOS) return `zastaralý iOS ${ios[1]}`
  const chrome = ua.match(/(?:Chrome|CriOS)\/(\d+)/)
  if (chrome) {
    const v = Number(chrome[1])
    if (v < MIN_CURRENT_CHROME) return `zastaralý Chrome ${v}`
    if (v <= MAX_SUSPICIOUS_CHROME_WITHOUT_ORIGIN && !hasOrigin) return `Chrome ${v} bez původu`
  }
  return null
}

export function isAffiliateEnded(retailer: GoRetailer, now: Date): boolean {
  if (!retailer.affiliate_ends_at) return false
  const ends = new Date(retailer.affiliate_ends_at)
  return !isNaN(ends.getTime()) && now >= ends
}

function directUrl(retailer: GoRetailer, offer: GoOffer): string | null {
  const direct = safeParseUrl(offer.product_url)
  if (direct) return direct.toString()
  return retailer.domain ? safeParseUrl(`https://${retailer.domain}`)?.toString() ?? null : null
}

/**
 * Affiliate cíl. Priorita: offer.affiliate_url → retailer.base_tracking_url
 * ({product_url}, {product_slug}, {ean}) → přímý product_url → homepage.
 */
export function resolveAffiliateUrl(retailer: GoRetailer, offer: GoOffer, ctx: { productSlug: string; ean: string | null }): string | null {
  const aff = safeParseUrl(offer.affiliate_url)
  if (aff) return aff.toString()
  if (retailer.base_tracking_url && (offer.product_url || !retailer.base_tracking_url.includes('{product_url}'))) {
    const filled = retailer.base_tracking_url
      .replace(/\{product_url\}/g, encodeURIComponent(offer.product_url ?? ''))
      .replace(/\{product_slug\}/g, encodeURIComponent(ctx.productSlug))
      .replace(/\{ean\}/g, encodeURIComponent(ctx.ean ?? ''))
    const parsed = safeParseUrl(filled)
    if (parsed) return parsed.toString()
  }
  return directUrl(retailer, offer)
}

export function decideGoTarget(retailer: GoRetailer, offer: GoOffer, ctx: GoContext): GoDecision {
  const rateLimited = ctx.recentClicksFromIp >= RATE_LIMIT_PER_MIN
  const reason = rateLimited ? `>${RATE_LIMIT_PER_MIN} kliků/min z jedné IP` : botReason(ctx.userAgent, ctx.hasOrigin, ctx.testHeader)

  // Boti nikdy přes eHUB (click fraud) a bez UTM (nenafukují prodejci GA4)
  if (reason) {
    return { target: directUrl(retailer, offer), mode: 'direct_bot', isTest: true, unverified: false, botReason: reason }
  }

  const unverified = !ctx.hasOrigin
  if (isAffiliateEnded(retailer, ctx.now)) {
    const d = directUrl(retailer, offer)
    return { target: d ? withReferralUtm(d) : null, mode: 'direct_affiliate_ended', isTest: false, unverified, botReason: null }
  }

  const target = resolveAffiliateUrl(retailer, offer, { productSlug: ctx.productSlug, ean: ctx.ean })
  const noNetwork = !retailer.affiliate_network && !retailer.base_tracking_url && !offer.affiliate_url
  return {
    target: target && noNetwork ? withReferralUtm(target) : target,
    mode: noNetwork ? 'direct_no_network' : 'affiliate',
    isTest: false,
    unverified,
    botReason: null,
  }
}
