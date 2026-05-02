// Resend webhook → loguj events (delivered, opened, clicked, bounced, complained).
// Setup: v Resend dashboard → Webhooks → URL: https://olivator.cz/api/webhooks/resend
// Resend posílá POST s JSON bodyo všech eventech.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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
  let payload: ResendWebhookPayload
  try {
    payload = await request.json()
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
