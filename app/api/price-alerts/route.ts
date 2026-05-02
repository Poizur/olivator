// POST /api/price-alerts — vytvoř alert na konkrétní produkt
// Body: { email, productId, thresholdPrice (volitelné, jinak auto -10 %) }
//
// User flow: na produktové stránce klik "Sleduj cenu" → modal s emailem + threshold
// → POST sem → response s confirmation. Token je unique per alert.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const masterEnabled = await getSetting<boolean>('newsletter_enabled')
    const alertsEnabled = await getSetting<boolean>('newsletter_alerts_enabled')
    if (!masterEnabled || !alertsEnabled) {
      return NextResponse.json({ error: 'Cenové alerty nejsou aktivní' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const email: string = (body.email ?? '').trim().toLowerCase()
    const productId: string = body.productId ?? ''
    const customThreshold: number | null = body.thresholdPrice ? Number(body.thresholdPrice) : null

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Neplatný email' }, { status: 400 })
    }
    if (!productId) {
      return NextResponse.json({ error: 'Chybí productId' }, { status: 400 })
    }

    // Načti produkt + aktuální nejlevnější cenu pro reference
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, slug, name')
      .eq('id', productId)
      .maybeSingle()
    if (!product) {
      return NextResponse.json({ error: 'Produkt nenalezen' }, { status: 404 })
    }

    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price, in_stock')
      .eq('product_id', productId)
      .eq('in_stock', true)
      .order('price', { ascending: true })
      .limit(1)

    const referencePrice = offers?.[0]?.price as number | undefined
    if (!referencePrice) {
      return NextResponse.json(
        { error: 'Produkt nemá aktivní nabídku — alert nemá smysl' },
        { status: 400 }
      )
    }

    // Pokud user nezadal threshold, použij -10 % od aktuální ceny
    const thresholdPrice = customThreshold ?? Math.round(referencePrice * 0.9)
    const autoThreshold = customThreshold === null

    if (thresholdPrice >= referencePrice) {
      return NextResponse.json(
        { error: 'Threshold musí být nižší než aktuální cena' },
        { status: 400 }
      )
    }

    // Najdi nebo vytvoř signup pro email (alerts mohou být i bez newsletteru)
    let signupId: string | null = null
    const { data: existingSignup } = await supabaseAdmin
      .from('newsletter_signups')
      .select('id, unsubscribe_token')
      .eq('email', email)
      .maybeSingle()
    if (existingSignup) {
      signupId = existingSignup.id as string
    } else {
      const { data: newSignup } = await supabaseAdmin
        .from('newsletter_signups')
        .insert({
          email,
          source: 'price_alert',
          confirmed: true,
          unsubscribed: false,
          unsubscribe_token: generateToken(),
          preferences: { weekly: false, deals: false, harvest: false, alerts: true },
        })
        .select('id')
        .single()
      signupId = (newSignup?.id as string) ?? null
    }

    // Vytvoř alert
    const alertToken = generateToken()
    const { data: alert, error } = await supabaseAdmin
      .from('price_alerts')
      .insert({
        signup_id: signupId,
        email,
        product_id: productId,
        product_slug: product.slug,
        threshold_price: thresholdPrice,
        auto_threshold: autoThreshold,
        reference_price: referencePrice,
        status: 'active',
        one_time: true,
        unsubscribe_token: alertToken,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[price-alerts]', error)
      return NextResponse.json({ error: 'Nepodařilo se vytvořit alert' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      alertId: alert?.id,
      thresholdPrice,
      referencePrice,
    })
  } catch (err) {
    console.error('[price-alerts]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
