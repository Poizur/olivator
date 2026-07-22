import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://olivator.cz'
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'Olivator <onboarding@resend.dev>'

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

async function sendConfirmEmail(email: string, token: string, productName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const confirmUrl = `${SITE}/api/price-watch/confirm?token=${token}`
  const html = `<!DOCTYPE html><html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,sans-serif;background:#f5f5f7;margin:0;padding:40px 0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;padding:40px;max-width:600px">
<tr><td>
  <div style="font-size:22px;font-weight:700;color:#2d6a4f;margin-bottom:8px">olivátor.cz</div>
  <h1 style="font-size:18px;color:#1d1d1f;margin:0 0 12px">Potvrďte hlídání ceny</h1>
  <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 24px">
    Chcete sledovat cenu produktu <strong>${productName}</strong>.<br>
    Jakmile cena klesne o 5 % nebo více, pošleme vám email.
  </p>
  <a href="${confirmUrl}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:500;margin-bottom:24px">
    Potvrdit hlídání ceny →
  </a>
  <p style="font-size:12px;color:#aeaeb2;margin:0">
    Pokud jste toto hlídání nenastavili, email ignorujte. Nic se nestane.
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [email],
      subject: `Potvrďte hlídání ceny — ${productName}`,
      html,
    }),
  }).catch(err => console.error('[price-watch] confirm email failed:', err))
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Neplatný požadavek.' }, { status: 400 })
  }

  const { email, productId, consentGiven } = body as {
    email?: string
    productId?: string
    consentGiven?: boolean
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ ok: false, error: 'Neplatná emailová adresa.' }, { status: 400 })
  }
  if (!productId || typeof productId !== 'string') {
    return NextResponse.json({ ok: false, error: 'Chybí identifikátor produktu.' }, { status: 400 })
  }
  if (!consentGiven) {
    return NextResponse.json({ ok: false, error: 'Souhlas se zpracováním je povinný.' }, { status: 400 })
  }

  const normalEmail = email.toLowerCase()

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, name, status')
    .eq('id', productId)
    .eq('status', 'active')
    .single()

  if (!product) {
    return NextResponse.json({ ok: false, error: 'Produkt nenalezen.' }, { status: 404 })
  }

  const { data: cheapestOffer } = await supabaseAdmin
    .from('product_offers')
    .select('price')
    .eq('product_id', productId)
    .eq('in_stock', true)
    .order('price', { ascending: true })
    .limit(1)
    .maybeSingle()

  const priceAtSignup = cheapestOffer?.price ?? null

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  // Auto-confirm if this email already has any confirmed watch (email is verified)
  const { count: confirmedCount } = await supabaseAdmin
    .from('price_watches')
    .select('*', { count: 'exact', head: true })
    .eq('email', normalEmail)
    .eq('confirmed', true)
    .eq('active', true)

  const autoConfirm = (confirmedCount ?? 0) > 0

  if (autoConfirm) {
    const { error } = await supabaseAdmin.from('price_watches').upsert(
      {
        email: normalEmail,
        product_id: productId,
        price_at_signup: priceAtSignup,
        confirmed: true,
        confirmation_token: null,
        consent_at: new Date().toISOString(),
        consent_ip: ip,
        active: true,
      },
      { onConflict: 'email,product_id' }
    )
    if (error) {
      console.error('[price-watch] upsert error:', error.message)
      return NextResponse.json({ ok: false, error: 'Chyba serveru.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, flow: 'auto_confirmed' })
  }

  const confirmationToken = generateToken()
  const { error } = await supabaseAdmin.from('price_watches').upsert(
    {
      email: normalEmail,
      product_id: productId,
      price_at_signup: priceAtSignup,
      confirmed: false,
      confirmation_token: confirmationToken,
      consent_at: new Date().toISOString(),
      consent_ip: ip,
      active: true,
    },
    { onConflict: 'email,product_id' }
  )
  if (error) {
    console.error('[price-watch] upsert error:', error.message)
    return NextResponse.json({ ok: false, error: 'Chyba serveru.' }, { status: 500 })
  }

  await sendConfirmEmail(normalEmail, confirmationToken, product.name)

  return NextResponse.json({ ok: true, flow: 'double_opt_in' })
}
