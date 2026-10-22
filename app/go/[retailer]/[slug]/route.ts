import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { decideGoTarget } from '@/lib/go-target'

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

function publicOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host || host.startsWith('localhost:8080')) return 'https://olivator.cz'
  const proto = request.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ retailer: string; slug: string }> }
) {
  const { retailer: retailerSlug, slug: productSlug } = await params
  const reqUrl = request.nextUrl

  const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = createHash('sha256').update(rawIp).digest('hex')
  const { count: recentCount } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('clicked_at', new Date(Date.now() - 60_000).toISOString())

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
    .select('id, domain, base_tracking_url, affiliate_network, affiliate_ends_at, is_active')
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
  const quarantined = retailer.is_active === false
  if (!quarantined && (oErr || !offer)) {
    return NextResponse.json({ error: 'No offer found' }, { status: 404 })
  }

  const userAgent = request.headers.get('user-agent') ?? ''
  const referrer = request.headers.get('referer') ?? ''
  // Priorita: ?st= (typ z AffiliateLink) > ?sp= (URL stránky) > Referer header.
  const stParam = reqUrl.searchParams.get('st')
  const spParam = reqUrl.searchParams.get('sp')
  const sourcePage = spParam ?? (referrer || null)
  const utm = {
    utm_source:   reqUrl.searchParams.get('utm_source')   ?? undefined,
    utm_medium:   reqUrl.searchParams.get('utm_medium')   ?? undefined,
    utm_campaign: reqUrl.searchParams.get('utm_campaign') ?? undefined,
    utm_content:  reqUrl.searchParams.get('utm_content')  ?? undefined,
  }
  const sourceType = stParam ?? deriveSourceType(sourcePage, utm.utm_medium)

  const decision = decideGoTarget(retailer, offer, {
    now: new Date(),
    userAgent,
    hasOrigin: Boolean(spParam || stParam || referrer || utm.utm_source),
    recentClicksFromIp: recentCount ?? 0,
    testHeader: request.headers.get('x-olivator-test') === '1',
    productSlug,
    // Za proxy Railway je reqUrl.origin interní (localhost:8080) — veřejnou adresu bereme z x-forwarded-host.
    productPageUrl: new URL(`/olej/${productSlug}`, publicOrigin(request)).toString(),
    ean: (product.ean as string) ?? null,
  })

  if (!decision.target) {
    console.warn('[affiliate] Invalid offer URL', { productSlug, retailerSlug, mode: decision.mode })
    return NextResponse.json({ error: 'Invalid offer URL' }, { status: 502 })
  }
  if (decision.mode === 'direct_bot') {
    console.warn('[affiliate] bot → přímo do obchodu', { ipHash: ipHash.slice(0, 16), productSlug, retailerSlug, reason: decision.botReason })
  }

  // AWAIT kvůli serverless lifecycle — fire-and-forget by insert ztratil.
  const { error: clickErr } = await supabaseAdmin.from('affiliate_clicks').insert({
    product_id: product.id,
    retailer_id: retailer.id,
    ip_hash: ipHash,
    user_agent: userAgent,
    referrer,
    market: 'CZ',
    source_page: sourcePage,
    source_type: sourceType,
    price_at_click: (offer?.price as number | null | undefined) ?? null,
    is_test: decision.isTest,
    unverified: decision.unverified,
    quarantined: decision.quarantined,
    ...utm,
  })
  if (clickErr) {
    console.error('[affiliate] click log failed', { product: productSlug, retailer: retailerSlug, errCode: clickErr.code, errMsg: clickErr.message })
  }

  return NextResponse.redirect(decision.target, 302)
}
