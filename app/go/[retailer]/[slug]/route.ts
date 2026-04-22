import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Resolve the target URL for an affiliate click.
 * Priority:
 *  1. offer.affiliate_url — explicit override (edge cases like Amazon/Heureka
 *     with per-product tracking params)
 *  2. retailer.base_tracking_url template with {product_url} placeholder
 *  3. offer.product_url — direct link to product at retailer
 *  4. https://{retailer.domain} — homepage fallback
 */
function resolveUrl(
  retailer: { base_tracking_url: string | null; domain: string | null },
  offer: { affiliate_url: string | null; product_url: string | null }
): string {
  if (offer.affiliate_url) return offer.affiliate_url

  if (retailer.base_tracking_url && offer.product_url) {
    return retailer.base_tracking_url.replace(
      '{product_url}',
      encodeURIComponent(offer.product_url)
    )
  }

  if (offer.product_url) return offer.product_url

  return `https://${retailer.domain ?? 'olivator.cz'}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ retailer: string; slug: string }> }
) {
  const { retailer: retailerSlug, slug: productSlug } = await params

  const { data: product, error: pErr } = await supabaseAdmin
    .from('products')
    .select('id')
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

  // Log click — fire and forget
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = createHash('sha256').update(ip).digest('hex')
  const userAgent = request.headers.get('user-agent') ?? ''
  const referrer = request.headers.get('referer') ?? ''

  supabaseAdmin
    .from('affiliate_clicks')
    .insert({
      product_id: product.id,
      retailer_id: retailer.id,
      ip_hash: ipHash,
      user_agent: userAgent,
      referrer,
      market: 'CZ',
    })
    .then(({ error }) => {
      if (error) console.error('[affiliate] Log failed:', error.message)
    })

  return NextResponse.redirect(resolveUrl(retailer, offer), 302)
}
