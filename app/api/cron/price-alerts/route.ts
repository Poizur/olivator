// Cron: zkontroluje aktivní cenové alerty a pošle email pokud cena spadla.
// Schedule: 1× denně (např. 9:00 UTC), nezávisle na weekly newsletter.

import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import React from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { getSetting } from '@/lib/settings'
import { sendTestEmail } from '@/lib/newsletter-sender'
import { PriceAlertEmail } from '@/emails/price-alert'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const SITE_URL = 'https://olivator.cz'

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  return provided === expected
}

interface AlertRow {
  id: string
  email: string
  product_id: string
  product_slug: string
  threshold_price: number
  reference_price: number | null
  status: string
  one_time: boolean
  unsubscribe_token: string | null
}

interface ProductRow {
  id: string
  name: string
  name_short: string | null
  image_url: string | null
  olivator_score: number
  brand_name: string | null
  cheapest_offer: {
    price: number
    retailer_name: string
    retailer_slug: string
  } | null
}

async function getProductWithCheapestOffer(productId: string): Promise<ProductRow | null> {
  const { data: product } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, name_short, image_url, olivator_score,
      brands ( name )
    `)
    .eq('id', productId)
    .maybeSingle()

  if (!product) return null

  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select(`
      price, in_stock,
      retailers ( name, slug, is_active )
    `)
    .eq('product_id', productId)
    .eq('in_stock', true)
    .order('price', { ascending: true })

  type OfferRow = {
    price: number
    in_stock: boolean
    retailers: { name: string; slug: string; is_active: boolean } | null
  }
  const validOffer = ((offers ?? []) as unknown as OfferRow[]).find(
    (o) => o.retailers?.is_active === true
  )

  type Brand = { name: string } | null
  const brand = (product.brands as unknown as Brand) ?? null

  return {
    id: product.id as string,
    name: (product.name_short as string | null) ?? (product.name as string),
    name_short: product.name_short as string | null,
    image_url: product.image_url as string | null,
    olivator_score: product.olivator_score as number,
    brand_name: brand?.name ?? null,
    cheapest_offer: validOffer
      ? {
          price: validOffer.price,
          retailer_name: validOffer.retailers!.name,
          retailer_slug: validOffer.retailers!.slug,
        }
      : null,
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const masterEnabled = await getSetting<boolean>('newsletter_enabled')
  const alertsEnabled = await getSetting<boolean>('newsletter_alerts_enabled')
  if (!masterEnabled || !alertsEnabled) {
    return NextResponse.json({
      ok: false,
      skipped: !masterEnabled ? 'newsletter_enabled = false' : 'alerts_enabled = false',
    })
  }

  // Načti všechny aktivní alerty
  const { data: alerts } = await supabaseAdmin
    .from('price_alerts')
    .select('*')
    .eq('status', 'active')
    .lt('expires_at', new Date(Date.now() + 1 * 86400000).toISOString())

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, triggered: 0 })
  }

  let triggered = 0
  let skipped = 0
  const errors: string[] = []

  for (const alert of alerts as AlertRow[]) {
    try {
      const product = await getProductWithCheapestOffer(alert.product_id)
      if (!product || !product.cheapest_offer) {
        skipped++
        continue
      }

      const currentPrice = product.cheapest_offer.price
      if (currentPrice > alert.threshold_price) {
        skipped++
        continue
      }

      // Trigger! Pošli email
      const ctaUrl = `${SITE_URL}/go/${product.cheapest_offer.retailer_slug}/${alert.product_slug}?utm_source=newsletter&utm_medium=email&utm_content=price_alert`
      const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${alert.unsubscribe_token ?? ''}`

      const element = React.createElement(PriceAlertEmail, {
        unsubscribeUrl: unsubUrl,
        productName: product.name,
        imageUrl: product.image_url,
        brandName: product.brand_name,
        score: product.olivator_score,
        triggeredPrice: currentPrice,
        thresholdPrice: alert.threshold_price,
        referencePrice: alert.reference_price,
        retailerName: product.cheapest_offer.retailer_name,
        ctaUrl,
      })

      const html = await render(element)
      const text = await render(element, { plainText: true })

      const sendResult = await sendTestEmail({
        to: alert.email,
        subject: `🔔 ${product.name} klesl na ${currentPrice} Kč`,
        html,
        text,
      })

      if (!sendResult.ok) {
        errors.push(`${alert.email}: ${sendResult.error}`)
        continue
      }

      // Update alert status
      await supabaseAdmin
        .from('price_alerts')
        .update({
          status: alert.one_time ? 'triggered' : 'active',
          triggered_at: new Date().toISOString(),
          triggered_price: currentPrice,
        })
        .eq('id', alert.id)

      triggered++
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'unknown error')
    }
  }

  return NextResponse.json({
    ok: true,
    checked: alerts.length,
    triggered,
    skipped,
    errors,
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
