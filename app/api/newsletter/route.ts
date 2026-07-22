import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import React from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { getSetting } from '@/lib/settings'
import { sendTransactionalEmail } from '@/lib/newsletter-sender'
import { WelcomeD0DealsEmail } from '@/emails/welcome-d0-deals'
import { enqueueWelcomeSeries, getWelcomeDeals } from '@/lib/welcome-series'
import crypto from 'crypto'

const SITE = 'https://olivator.cz'

export const dynamic = 'force-dynamic'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

/** Sync to Resend Audiences (best-effort, doesn't block). Vyžaduje
 *  RESEND_API_KEY a NEWSLETTER_AUDIENCE_ID env var. */
async function syncToResend(email: string): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.NEWSLETTER_AUDIENCE_ID
  if (!apiKey || !audienceId) return null
  try {
    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { id?: string }
    return data.id ?? null
  } catch {
    return null
  }
}

interface PreferencesInput {
  weekly?: boolean
  deals?: boolean
  harvest?: boolean
  alerts?: boolean
}

const DEFAULT_PREFERENCES = {
  weekly: true,
  deals: true,
  harvest: false,
  alerts: false,
}

function sanitizePreferences(input: unknown): typeof DEFAULT_PREFERENCES {
  if (!input || typeof input !== 'object') return DEFAULT_PREFERENCES
  const p = input as PreferencesInput
  return {
    weekly: typeof p.weekly === 'boolean' ? p.weekly : DEFAULT_PREFERENCES.weekly,
    deals: typeof p.deals === 'boolean' ? p.deals : DEFAULT_PREFERENCES.deals,
    harvest: typeof p.harvest === 'boolean' ? p.harvest : DEFAULT_PREFERENCES.harvest,
    alerts: typeof p.alerts === 'boolean' ? p.alerts : DEFAULT_PREFERENCES.alerts,
  }
}

function generateUnsubToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function generateConfirmToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

async function sendLeadMagnetConfirmEmail(email: string, token: string) {
  const confirmUrl = `${SITE}/api/newsletter/confirm?token=${token}`
  const html = `<!DOCTYPE html><html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Helvetica Neue,Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
  <div style="background:#2d6a4f;padding:28px 36px;"><div style="color:#fff;font-size:18px;font-weight:700;">olivátor.cz</div></div>
  <div style="padding:36px;">
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:600;color:#1a1a1a;line-height:1.3;">Potvrďte svůj email</h1>
    <p style="color:#3d3d3d;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Jeden krok vás dělí od průvodce <strong>Jak vybrat kvalitní olivový olej</strong>. Klikněte na tlačítko níže — pošleme vám PDF ihned.
    </p>
    <a href="${confirmUrl}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;margin-bottom:28px;">
      Potvrdit a stáhnout průvodce
    </a>
    <p style="color:#878779;font-size:13px;line-height:1.6;margin:0;">
      Pokud jste o průvodce nežádali, tento email ignorujte. Nic se nestane.
    </p>
  </div>
  <div style="padding:14px 36px;background:#f5f5f7;border-top:1px solid #e8e8ed;">
    <p style="margin:0;font-size:12px;color:#878779;">olivátor.cz · Tento email vám přišel jako odpověď na váš zájem o průvodce olivovými oleji.</p>
  </div>
</div>
</body></html>`

  const text = `Potvrďte svůj email a stáhněte průvodce olivovými oleji:\n${confirmUrl}\n\nPokud jste o průvodce nežádali, tento email ignorujte.`

  await sendTransactionalEmail({
    to: email,
    subject: 'Potvrďte email — průvodce olivovým olejem na vás čeká',
    html,
    text,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email: string = (body.email ?? '').trim().toLowerCase()
    const source: string = body.source ?? 'unknown'
    const preferences = sanitizePreferences(body.preferences)

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Neplatný email' }, { status: 400 })
    }
    if (email.length > 255) {
      return NextResponse.json({ error: 'Email moc dlouhý' }, { status: 400 })
    }
    if (!Object.values(preferences).some(Boolean)) {
      return NextResponse.json(
        { error: 'Vyber alespoň jeden typ obsahu' },
        { status: 400 }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
    const ipHash = hashIp(ip)
    const userAgent = request.headers.get('user-agent') ?? ''

    let stored = false
    let isNewSubscriber = true
    try {
      // Načti existující řádek aby se zachoval token (pokud existuje)
      const { data: existing } = await supabaseAdmin
        .from('newsletter_signups')
        .select('id, unsubscribe_token')
        .eq('email', email)
        .maybeSingle()

      if (existing) isNewSubscriber = false
      const unsubToken = (existing?.unsubscribe_token as string | null) ?? generateUnsubToken()

      const { error } = await supabaseAdmin
        .from('newsletter_signups')
        .upsert(
          {
            email,
            source: source.slice(0, 50),
            ip_hash: ipHash,
            user_agent: userAgent.slice(0, 500),
            confirmed: true,
            unsubscribed: false,
            unsubscribed_at: null,
            unsubscribe_token: unsubToken,
            preferences,
          },
          { onConflict: 'email', ignoreDuplicates: false }
        )
      if (!error) stored = true
      else if (error.code !== '42P01' && error.code !== 'PGRST205') {
        console.warn('[newsletter] DB upsert error:', error.message)
      }
    } catch (err) {
      console.warn('[newsletter] DB write skipped:', err)
    }

    const resendId = await syncToResend(email)
    if (resendId && stored) {
      await supabaseAdmin
        .from('newsletter_signups')
        .update({ resend_contact_id: resendId })
        .eq('email', email)
        .then(() => null, () => null)
    }

    // ── Lead magnet: double opt-in flow ────────────────────────────────────
    if (source === 'lead_magnet' && stored) {
      const confirmToken = generateConfirmToken()
      const consentText = 'Souhlasím se zasíláním průvodce olivovými oleji a navazující email série (4 emaily). Odhlásit se lze kdykoliv.'

      await supabaseAdmin
        .from('newsletter_signups')
        .update({
          confirmed: false,
          confirmation_token: confirmToken,
          consent_text: consentText,
        })
        .eq('email', email)
        .then(() => null, (e) => console.warn('[newsletter] lead_magnet token update:', e))

      await sendLeadMagnetConfirmEmail(email, confirmToken).catch(e =>
        console.error('[newsletter] confirm email failed:', e.message)
      )

      return NextResponse.json({ ok: true, flow: 'double_opt_in' })
    }
    // ───────────────────────────────────────────────────────────────────────

    // Notifikace majiteli o novém odběrateli (best-effort)
    if (stored) {
      const alertEmail = await getSetting<string>('notification_email').catch(() => null)
      if (alertEmail) {
        sendTransactionalEmail({
          to: alertEmail,
          subject: isNewSubscriber
            ? `Nový odběratel: ${email}`
            : `Re-subscribe: ${email}`,
          html: `<p>${isNewSubscriber ? 'Nový odběratel' : 'Znovu přihlášen'}: <strong>${email}</strong></p><p>Zdroj: ${source}</p><p>Preference: ${Object.entries(preferences).filter(([, v]) => v).map(([k]) => k).join(', ')}</p>`,
          text: `${isNewSubscriber ? 'Nový odběratel' : 'Znovu přihlášen'}: ${email}\nZdroj: ${source}\nPreference: ${Object.entries(preferences).filter(([, v]) => v).map(([k]) => k).join(', ')}`,
        }).catch(() => null)
      }
    }

    // Pošli welcome email + zařaď do welcome série (best-effort)
    if (stored) {
      const { data: sub } = await supabaseAdmin
        .from('newsletter_signups')
        .select('id, unsubscribe_token')
        .eq('email', email)
        .maybeSingle()
      const unsubToken = (sub?.unsubscribe_token as string | null) ?? ''
      const unsubUrl = `https://olivator.cz/api/newsletter/unsubscribe?token=${unsubToken}`
      const { deals, topPickIndex, topPickReason, mode } = await getWelcomeDeals().catch(() => ({ deals: [], topPickIndex: 0, topPickReason: '', mode: 'tips' as const }))
      const d0Props = { unsubscribeUrl: unsubUrl, deals, topPickIndex, topPickReason, mode }
      const html = await render(React.createElement(WelcomeD0DealsEmail, d0Props))
      const text = await render(React.createElement(WelcomeD0DealsEmail, d0Props), { plainText: true })
      const subject = mode === 'deals'
        ? 'Olíkův první pozdrav — a co se zrovna slevuje'
        : 'Olíkův první pozdrav — tři tipy z katalogu'
      await sendTransactionalEmail({ to: email, subject, html, text }).catch(() => null)
      if (sub?.id) {
        await enqueueWelcomeSeries(sub.id as string).catch(() => null)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[newsletter]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
