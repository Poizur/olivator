// Resend webhook → loguj events (delivered, opened, clicked, bounced, complained).
// Setup: v Resend dashboard → Webhooks → URL: https://olivator.cz/api/webhooks/resend
//
// Bezpečnost: ověřujeme Svix signature (Resend používá Svix pro signing).
// Bez RESEND_WEBHOOK_SECRET endpoint funguje i bez verifikace (dev fallback),
// ale v produkci VŽDY nastav.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Ověř Svix webhook signature (Resend uses Svix).
 * Headers: svix-id, svix-timestamp, svix-signature
 * Signature format: "v1,<base64-hmac>" (může být víc oddělené mezerou)
 *
 * Vrátí true pokud signature sedí, false pokud ne (nebo chybí secret).
 * Pokud RESEND_WEBHOOK_SECRET není nastaven, vrátí true (dev mode).
 */
function verifySignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[resend webhook] RESEND_WEBHOOK_SECRET not set — accepting without verification')
    return true
  }
  if (!svixId || !svixTimestamp || !svixSignature) {
    return false
  }

  // Replay protection: reject older than 5 minut
  const now = Math.floor(Date.now() / 1000)
  const ts = Number(svixTimestamp)
  if (Number.isNaN(ts) || Math.abs(now - ts) > 300) {
    return false
  }

  // Strip "whsec_" prefix → decode base64 to bytes
  const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let secretBytes: Buffer
  try {
    secretBytes = Buffer.from(secretKey, 'base64')
  } catch {
    return false
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`
  const expected = crypto
    .createHmac('sha256', secretBytes)
    .update(signedPayload)
    .digest('base64')

  // svix-signature může být "v1,sigA v1,sigB" — split a porovnat každý
  const sigs = svixSignature.split(' ').map((s) => s.split(',')[1])
  for (const sig of sigs) {
    if (sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return true
    }
  }
  return false
}

interface ResendWebhookPayload {
  type: string  // "email.sent" | "email.delivered" | "email.opened" | "email.clicked" | "email.bounced" | "email.complained"
  data: {
    email_id: string
    to?: string[]
    subject?: string
    click?: { link: string; userAgent?: string }
    bounce?: { reason?: string }
  }
  created_at: string
}

const TYPE_MAP: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
}

export async function POST(request: NextRequest) {
  // Verify Svix signature před parsováním body
  const rawBody = await request.text()
  const ok = verifySignature(
    rawBody,
    request.headers.get('svix-id'),
    request.headers.get('svix-timestamp'),
    request.headers.get('svix-signature')
  )
  if (!ok) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: ResendWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = TYPE_MAP[payload.type]
  if (!eventType) {
    // Ignore unknown event types (Resend přidává nové) — vrátíme 200 aby nevracel
    return NextResponse.json({ ok: true, ignored: payload.type })
  }

  const messageId = payload.data?.email_id
  if (!messageId) {
    return NextResponse.json({ error: 'Missing email_id' }, { status: 400 })
  }

  // Najdi send podle resend_message_id
  const { data: send } = await supabaseAdmin
    .from('newsletter_sends')
    .select('id')
    .eq('resend_message_id', messageId)
    .maybeSingle()

  if (!send) {
    // Není to náš tracked send (možná notifikační email z lib/email.ts)
    return NextResponse.json({ ok: true, ignored: 'not tracked' })
  }

  // Loguj event
  await supabaseAdmin.from('newsletter_events').insert({
    send_id: send.id,
    event_type: eventType,
    link_url: payload.data.click?.link ?? null,
    block_id: null, // můžeme parsovat z UTM v URL později
    user_agent: payload.data.click?.userAgent ?? null,
    occurred_at: payload.created_at,
  })

  // Aktualizuj summary fields v sends
  const update: Record<string, unknown> = {}
  switch (eventType) {
    case 'delivered':
      update.status = 'delivered'
      update.delivered_at = payload.created_at
      break
    case 'opened':
      // Jen první open — ne overwriteneme pozdější
      update.opened_at = payload.created_at
      break
    case 'clicked':
      update.first_clicked_at = payload.created_at
      // increment click_count přes RPC by bylo lepší; pro start skip
      break
    case 'bounced':
      update.status = 'bounced'
      update.error_message = payload.data.bounce?.reason ?? 'bounced'
      break
    case 'complained':
      update.status = 'complained'
      // Auto-unsubscribe komplainera
      const { data: sendDetail } = await supabaseAdmin
        .from('newsletter_sends')
        .select('signup_id')
        .eq('id', send.id)
        .maybeSingle()
      if (sendDetail?.signup_id) {
        await supabaseAdmin
          .from('newsletter_signups')
          .update({
            unsubscribed: true,
            unsubscribed_at: new Date().toISOString(),
          })
          .eq('id', sendDetail.signup_id)
      }
      break
  }

  if (Object.keys(update).length > 0) {
    await supabaseAdmin.from('newsletter_sends').update(update).eq('id', send.id)
  }

  return NextResponse.json({ ok: true })
}
