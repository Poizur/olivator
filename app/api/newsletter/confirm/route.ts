/**
 * GET /api/newsletter/confirm?token=<confirmation_token>
 *
 * Double opt-in potvrzení pro lead_magnet source.
 * 1. Ověří token → najde subscriber
 * 2. Nastaví confirmed=true, consent_at, consent_ip
 * 3. Odešle Email 0 (PDF průvodce) přes sendTransactionalEmail
 * 4. Zařadí Emaily 1–3 do email_drip_queue
 * 5. Přesměruje na /dekujeme?source=lead_magnet
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTransactionalEmail } from '@/lib/newsletter-sender'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SITE = 'https://olivator.cz'
const PDF_URL = `${SITE}/pruvodce-olivovy-olej.pdf`

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

function getDayOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim()

  if (!token || token.length < 32) {
    return NextResponse.redirect(`${SITE}/?confirm=invalid`)
  }

  // Lookup subscriber
  const { data: sub, error } = await supabaseAdmin
    .from('newsletter_signups')
    .select('id, email, confirmed, unsubscribe_token, source')
    .eq('confirmation_token', token)
    .maybeSingle()

  if (error || !sub) {
    return NextResponse.redirect(`${SITE}/?confirm=not_found`)
  }

  if (sub.confirmed) {
    // Idempotent: already confirmed → just redirect
    return NextResponse.redirect(`${SITE}/dekujeme?source=lead_magnet&state=already`)
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const consentIpHash = hashIp(ip)
  const now = new Date().toISOString()

  // Mark confirmed + log GDPR consent
  const { error: updateErr } = await supabaseAdmin
    .from('newsletter_signups')
    .update({
      confirmed: true,
      consent_at: now,
      consent_ip: consentIpHash,
    })
    .eq('id', sub.id)

  if (updateErr) {
    console.error('[confirm] DB update failed:', updateErr.message)
    return NextResponse.redirect(`${SITE}/?confirm=error`)
  }

  // Enqueue drip emails 1-3 (Email 0 sent immediately below)
  const dripRows = [
    { subscriber_id: sub.id, series: 'lead_magnet', email_number: 1, scheduled_at: getDayOffset(3) },
    { subscriber_id: sub.id, series: 'lead_magnet', email_number: 2, scheduled_at: getDayOffset(7) },
    { subscriber_id: sub.id, series: 'lead_magnet', email_number: 3, scheduled_at: getDayOffset(14) },
  ]

  await supabaseAdmin
    .from('email_drip_queue')
    .upsert(dripRows, { onConflict: 'subscriber_id,series,email_number', ignoreDuplicates: true })
    .then(() => null, (e) => console.warn('[confirm] drip enqueue error:', e))

  // Send Email 0: PDF průvodce (ihned)
  const unsubUrl = `${SITE}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token ?? ''}`
  await sendLeadMagnetEmail0(sub.email as string, unsubUrl).catch(e =>
    console.error('[confirm] Email 0 send error:', e.message)
  )

  // Log pdf_sent_at
  await supabaseAdmin
    .from('newsletter_signups')
    .update({ pdf_sent_at: new Date().toISOString() })
    .eq('id', sub.id)
    .then(() => null, () => null)

  return NextResponse.redirect(`${SITE}/dekujeme?source=lead_magnet`)
}

async function sendLeadMagnetEmail0(email: string, unsubUrl: string) {
  const html = `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Váš průvodce olivovým olejem</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Helvetica Neue,Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
  <div style="background:#2d6a4f;padding:28px 36px;">
    <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-.01em;">olivátor.cz</div>
  </div>
  <div style="padding:36px;">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1a1a1a;line-height:1.3;">
      Váš průvodce olivovým olejem je připraven 🫒
    </h1>
    <p style="margin:0 0 20px;color:#3d3d3d;font-size:15px;line-height:1.7;">
      Díky za potvrzení! Průvodce <strong>Jak vybrat kvalitní olivový olej</strong> si stáhnete kliknutím na tlačítko níže.
    </p>
    <a href="${PDF_URL}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:15px;font-weight:600;margin-bottom:28px;">
      Stáhnout průvodce (PDF)
    </a>
    <hr style="border:none;border-top:1px solid #e8e8ed;margin:0 0 24px;">
    <p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;font-weight:600;">Co vás čeká v průvodci:</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#3d3d3d;font-size:14px;line-height:1.8;">
      <li>Co dělá olivový olej skutečně kvalitním (polyfenoly, kyselost)</li>
      <li>Jak číst etiketu — 5 klíčových údajů</li>
      <li>3 mýty, na které většina kupujících naletí</li>
      <li>Olivátor Score — transparentní metodika hodnocení</li>
      <li>Nákupní checklist do kapsy</li>
    </ul>
    <p style="margin:0 0 8px;color:#878779;font-size:13px;line-height:1.6;">
      V dalších dnech vám pošleme ještě tři krátké tipy — vždy přímo k věci, bez zbytečného obsahu.
    </p>
  </div>
  <div style="padding:16px 36px;background:#f5f5f7;border-top:1px solid #e8e8ed;">
    <p style="margin:0;font-size:12px;color:#878779;">
      Chcete přestat dostávat emaily?
      <a href="${unsubUrl}" style="color:#2d6a4f;text-decoration:underline;">Odhlásit odběr</a>
      &nbsp;·&nbsp; olivátor.cz
    </p>
  </div>
</div>
</body></html>`

  const text = `Váš průvodce olivovým olejem je připraven!\n\nStáhněte si PDF průvodce:\n${PDF_URL}\n\nObsah:\n- Co dělá olivový olej skutečně kvalitním\n- Jak číst etiketu\n- 3 mýty o olivovém oleji\n- Olivátor Score — metodika\n- Nákupní checklist\n\nOdhlásit: ${unsubUrl}`

  await sendTransactionalEmail({
    to: email,
    subject: 'Váš průvodce olivovým olejem je připraven 🫒',
    html,
    text,
  })
}
