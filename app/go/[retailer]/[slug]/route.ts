import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Odvodí typ stránky z URL cesty refereru.
 * utm_medium=email má prioritu (newslettery nemají interní referer).
 */
function deriveSourceType(sourcePage: string | null, utmMedium?: string): string {
  if (utmMedium === 'email') return 'email'
  if (!sourcePage) return 'unknown'
  try {
    const path = new URL(sourcePage).pathname
    if (path === '/' || path === '') return 'homepage'
    if (path.startsWith('/olej/')) return 'product'
    if (path.startsWith('/zebricek')) return 'zebricek'
    if (path.startsWith('/srovnavac')) return 'srovnavac'
    if (path.startsWith('/slevy')) return 'slevy'
    if (path.startsWith('/pruvodce/') || path.startsWith('/recept/')) return 'clanek'
  } catch {
    // neparsovatelná URL → unknown
  }
  return 'unknown'
}

/**
 * Validuje URL: pouze http/https + (volitelně) doménový allowlist.
 * Vrací parsed URL nebo null.
 */
function safeParseUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u
  } catch {
    return null
  }
}

/**
 * Resolve the target URL for an affiliate click.
 * Priority:
 *  1. offer.affiliate_url — explicit override (edge cases like Amazon/Heureka
 *     with per-product tracking params)
 *  2. retailer.base_tracking_url template — placeholdery:
 *     - {product_url}  → URL produktu (URL-encoded)
 *     - {product_slug} → slug produktu (URL-encoded), užitečné pro eHUB data1
 *     - {ean}          → EAN, pokud existuje
 *  3. offer.product_url — direct link to product at retailer
 *  4. https://{retailer.domain} — homepage fallback
 */
function resolveUrl(
  retailer: { base_tracking_url: string | null; domain: string | null },
  offer: { affiliate_url: string | null; product_url: string | null },
  ctx: { productSlug: string; ean: string | null }
): string | null {
  // 1) explicit affiliate URL
  const aff = safeParseUrl(offer.affiliate_url)
  if (aff) return aff.toString()

  // 2) tracking template + placeholdery
  if (retailer.base_tracking_url) {
    if (!offer.product_url && retailer.base_tracking_url.includes('{product_url}')) {
      // Template potřebuje product_url, ale offer ho nemá → fallback níže
    } else {
      const filled = retailer.base_tracking_url
        .replace(/\{product_url\}/g, encodeURIComponent(offer.product_url ?? ''))
        .replace(/\{product_slug\}/g, encodeURIComponent(ctx.productSlug))
        .replace(/\{ean\}/g, encodeURIComponent(ctx.ean ?? ''))
      const parsed = safeParseUrl(filled)
      if (parsed) return parsed.toString()
    }
  }

  // 3) přímý product URL
  const direct = safeParseUrl(offer.product_url)
  if (direct) return direct.toString()

  // 4) fallback na retailer homepage
  if (retailer.domain) {
    const home = safeParseUrl(`https://${retailer.domain}`)
    if (home) return home.toString()
  }

  return null
}

// Kliky za posledních 60 sekund ze stejné IP překračující tento limit = bot
const RATE_LIMIT_PER_MIN = 5

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ retailer: string; slug: string }> }
) {
  const { retailer: retailerSlug, slug: productSlug } = await params

  // Bot filter: rate limit per IP before any eHUB redirect
  const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const earlyIpHash = createHash('sha256').update(rawIp).digest('hex')
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
  const { count: recentCount } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', earlyIpHash)
    .gte('clicked_at', oneMinuteAgo)
  const isRateLimited = (recentCount ?? 0) >= RATE_LIMIT_PER_MIN

  const { data: product, error: pErr } = await supabaseAdmin
    .from('products')
    .select('id, ean')
    .eq('slug', productSlug)
    .maybeSingle()
  if (pErr || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const { data: retailer, error: rErr } = await supabaseAdmin
    .from('retailers')
    .select('id, domain, base_tracking_url')
    .eq('slug', retailerSlug)
    .maybeSingle()
  if (rErr || !retailer) {
    return NextResponse.json({ error: 'Retailer not found' }, { status: 404 })
  }

  const { data: offer, error: oErr } = await supabaseAdmin
    .from('product_offers')
    .select('affiliate_url, product_url, price')
    .eq('product_id', product.id)
    .eq('retailer_id', retailer.id)
    .maybeSingle()
  if (oErr || !offer) {
    return NextResponse.json({ error: 'No offer found' }, { status: 404 })
  }

  // Resolve target URL — pro rate-limited requesty použij přímou URL, ne eHUB tracking
  let target: string | null
  if (isRateLimited) {
    // Bypass eHUB: přímý product URL nebo retailer homepage
    const directUrl = safeParseUrl(offer.product_url)
    target = directUrl
      ? directUrl.toString()
      : retailer.domain
        ? `https://${retailer.domain}`
        : null
    console.warn('[affiliate] rate-limit bot blocked', {
      ipHash: earlyIpHash.slice(0, 16),
      productSlug,
      retailerSlug,
      recentCount,
    })
  } else {
    target = resolveUrl(retailer, offer, {
      productSlug,
      ean: (product.ean as string) ?? null,
    })
  }

  if (!target) {
    console.warn('[affiliate] Invalid offer URL', {
      productSlug,
      retailerSlug,
      affiliate_url: offer.affiliate_url,
      product_url: offer.product_url,
    })
    return NextResponse.json({ error: 'Invalid offer URL' }, { status: 502 })
  }

  // Log click — AWAIT kvůli serverless lifecycle (Vercel/Railway zmrazí
  // runtime hned po redirect → fire-and-forget by ztratil insert).
  const ip = rawIp
  const ipHash = earlyIpHash
  const userAgent = request.headers.get('user-agent') ?? ''
  const referrer = request.headers.get('referer') ?? ''
  const reqUrl = request.nextUrl
  const utm = {
    utm_source:   reqUrl.searchParams.get('utm_source')   ?? undefined,
    utm_medium:   reqUrl.searchParams.get('utm_medium')   ?? undefined,
    utm_campaign: reqUrl.searchParams.get('utm_campaign') ?? undefined,
    utm_content:  reqUrl.searchParams.get('utm_content')  ?? undefined,
  }

  // Odvoď source_page + source_type.
  // Priorita: ?st= (explicitní typ z AffiliateLink) > ?sp= (URL stránky) > Referer header.
  const stParam = reqUrl.searchParams.get('st')
  const spParam = reqUrl.searchParams.get('sp')
  const sourcePage = spParam ?? (referrer || null)
  const sourceType = stParam ?? deriveSourceType(sourcePage, utm.utm_medium)

  const lowerUA = userAgent.toLowerCase()
  const isTest =
    isRateLimited ||
    userAgent === 'node' ||
    userAgent.startsWith('curl/') ||
    lowerUA.includes('jscrawler') ||
    lowerUA.includes('olivatortest') ||
    request.headers.get('x-olivator-test') === '1' ||
    lowerUA.includes('bot') ||
    lowerUA.includes('crawler') ||
    lowerUA.includes('spider') ||
    lowerUA.includes('meta-webindexer') ||
    lowerUA.includes('semrush') ||
    lowerUA.includes('ahref')

  const { error: clickErr } = await supabaseAdmin.from('affiliate_clicks').insert({
    product_id: product.id,
    retailer_id: retailer.id,
    ip_hash: ipHash,
    user_agent: userAgent,
    referrer,
    market: 'CZ',
    source_page: sourcePage,
    source_type: sourceType,
    price_at_click: (offer.price as number | null) ?? null,
    is_test: isTest,
    ...utm,
  })
  if (clickErr) {
    console.error('[affiliate] click log failed', {
      product: productSlug,
      retailer: retailerSlug,
      errCode: clickErr.code,
      errMsg: clickErr.message,
      isTest,
    })
  }

  return NextResponse.redirect(target, 302)
}
