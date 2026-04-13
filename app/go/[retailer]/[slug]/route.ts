import { NextRequest, NextResponse } from 'next/server'
import { getProducts, getOffersForProduct, RETAILERS } from '@/lib/mock-data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ retailer: string; slug: string }> }
) {
  const { retailer: retailerSlug, slug: productSlug } = await params

  const product = getProducts().find(p => p.slug === productSlug)
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const retailer = RETAILERS.find(r => r.slug === retailerSlug)
  if (!retailer) {
    return NextResponse.json({ error: 'Retailer not found' }, { status: 404 })
  }

  const offers = getOffersForProduct(product.id)
  const offer = offers.find(o => o.retailerId === retailer.id)
  if (!offer) {
    return NextResponse.json({ error: 'No offer found' }, { status: 404 })
  }

  // TODO: Log click to affiliate_clicks table in Supabase
  // For now, log to console
  console.log(`[affiliate] Click: ${retailerSlug}/${productSlug} — ${new Date().toISOString()}`)

  // In production, redirect to actual affiliate URL
  // For MVP with mock data, redirect to retailer domain
  const redirectUrl = offer.affiliateUrl || `https://${retailer.domain}`

  return NextResponse.redirect(redirectUrl, 302)
}
