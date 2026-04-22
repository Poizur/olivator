import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ retailer: string; slug: string }> }
) {
  const { retailer: retailerSlug, slug: productSlug } = await params

  // 1. Fetch product + retailer + offer in one shot
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
    .select('id, domain')
    .eq('slug', retailerSlug)
    .maybeSingle()
  if (rErr || !retailer) {
    return NextResponse.json({ error: 'Retailer not found' }, { status: 404 })
  }

  const { data: offer, error: oErr } = await supabaseAdmin
    .from('product_offers')
    .select('affiliate_url')
    .eq('product_id', product.id)
    .eq('retailer_id', retailer.id)
    .maybeSingle()
  if (oErr || !offer) {
    return NextResponse.json({ error: 'No offer found' }, { status: 404 })
  }

  // 2. Log click (fire-and-forget, don't block redirect)
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

  // 3. Redirect
  const redirectUrl = offer.affiliate_url || `https://${retailer.domain}`
  return NextResponse.redirect(redirectUrl, 302)
}
