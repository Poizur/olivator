import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ retailer: string; slug: string }> }
) {
  const { retailer: retailerSlug, slug: productSlug } = await params

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
    .select('affiliate_url, product_url')
    .eq('product_id', product.id)
    .eq('retailer_id', retailer.id)
    .maybeSingle()
  if (oErr || !offer) {
    return NextResponse.json({ error: 'No offer found' }, { status: 404 })
  }

  // Resolve + validate target URL PŘED logem (kdyby URL nebyla validní,
  // nelogujeme zbytečně klik který se nikam nedostane).
  const target = resolveUrl(retailer, offer, {
    productSlug,
    ean: (product.ean as string) ?? null,
  })
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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = createHash('sha256').update(ip).digest('hex')
  const userAgent = request.headers.get('user-agent') ?? ''
  const referrer = request.headers.get('referer') ?? ''

  const { error: clickErr } = await supabaseAdmin.from('affiliate_clicks').insert({
    product_id: product.id,
    retailer_id: retailer.id,
    ip_hash: ipHash,
    user_agent: userAgent,
    referrer,
    market: 'CZ',
  })
  if (clickErr) console.error('[affiliate] Log failed:', clickErr.message)

  return NextResponse.redirect(target, 302)
}
