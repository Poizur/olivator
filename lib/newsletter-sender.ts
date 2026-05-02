// Newsletter sender — render + Resend bulk send + DB tracking.
//
// Flow:
//  1. Vyber draft z DB (status='approved')
//  2. Filter recipients podle audience_filter + preferences
//  3. Pro každého: personalizuj unsubscribe link + UTM, send via Resend
//  4. Loguj do newsletter_sends s resend_message_id
//
// Bulk vs individual:
//  - Pro start: individual sends (loop). Resend pak pošle 10 emailů/sec.
//  - Při 100+ subscribers: použít Resend Broadcasts API (taktéž má per-recipient
//    personalizaci přes merge tags) — později.

import { supabaseAdmin } from './supabase'

interface SendResult {
  ok: boolean
  totalSent: number
  totalFailed: number
  errors: string[]
}

interface DraftRow {
  id: string
  campaign_type: string
  subject: string
  preheader: string | null
  html_body: string
  text_body: string | null
  status: string
  audience_filter: Record<string, unknown> | null
}

interface SignupRow {
  id: string
  email: string
  unsubscribe_token: string | null
  preferences: Record<string, boolean> | null
}

const SITE_URL = 'https://olivator.cz'
const RESEND_FROM =
  process.env.RESEND_NEWSLETTER_FROM ||
  process.env.RESEND_FROM_EMAIL ||
  'olivátor <onboarding@resend.dev>'

/**
 * Pošli draft všem subscriberům kteří mají odpovídající preferenci.
 * Markuje draft jako 'sending' → 'sent' (nebo 'failed').
 */
export async function sendDraft(draftId: string): Promise<SendResult> {
  const result: SendResult = { ok: true, totalSent: 0, totalFailed: 0, errors: [] }

  // 1. Načti draft
  const { data: draft, error: draftErr } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('*')
    .eq('id', draftId)
    .maybeSingle()

  if (draftErr || !draft) {
    return { ok: false, totalSent: 0, totalFailed: 0, errors: ['Draft not found'] }
  }
  const d = draft as DraftRow

  if (d.status !== 'approved') {
    return {
      ok: false,
      totalSent: 0,
      totalFailed: 0,
      errors: [`Draft status must be 'approved', got '${d.status}'`],
    }
  }

  // 2. Označ draft jako sending
  await supabaseAdmin
    .from('newsletter_drafts')
    .update({ status: 'sending' })
    .eq('id', draftId)

  // 3. Najdi cílové publikum
  // Klíč v preferences podle campaign_type
  const prefKey = d.campaign_type // 'weekly' | 'deals' | 'harvest' | 'alert'

  const { data: signups, error: signupsErr } = await supabaseAdmin
    .from('newsletter_signups')
    .select('id, email, unsubscribe_token, preferences')
    .eq('confirmed', true)
    .eq('unsubscribed', false)

  if (signupsErr) {
    await supabaseAdmin
      .from('newsletter_drafts')
      .update({ status: 'failed' })
      .eq('id', draftId)
    return { ok: false, totalSent: 0, totalFailed: 0, errors: [signupsErr.message] }
  }

  // Filter: jen ti kdo mají preferenci pro tenhle campaign type
  const targets = ((signups ?? []) as SignupRow[]).filter((s) => {
    const prefs = s.preferences ?? { weekly: true, deals: true, harvest: false, alerts: false }
    return prefs[prefKey] === true
  })

  if (targets.length === 0) {
    await supabaseAdmin
      .from('newsletter_drafts')
      .update({ status: 'sent', recipient_count: 0 })
      .eq('id', draftId)
    return { ok: true, totalSent: 0, totalFailed: 0, errors: ['No matching recipients'] }
  }

  // 4. Loop send (Resend rate limit: 10/sec na free tier)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    await supabaseAdmin
      .from('newsletter_drafts')
      .update({ status: 'failed' })
      .eq('id', draftId)
    return {
      ok: false,
      totalSent: 0,
      totalFailed: 0,
      errors: ['RESEND_API_KEY not set'],
    }
  }

  for (const signup of targets) {
    // Personalizuj HTML — nahraď placeholder pro unsubscribe URL
    const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${signup.unsubscribe_token ?? ''}`
    const personalizedHtml = d.html_body.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl)
    const personalizedText = (d.text_body ?? '').replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl)

    // Pre-create send row
    const { data: sendRow } = await supabaseAdmin
      .from('newsletter_sends')
      .insert({
        draft_id: draftId,
        signup_id: signup.id,
        recipient_email: signup.email,
        status: 'pending',
      })
      .select('id')
      .single()

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [signup.email],
          subject: d.subject,
          html: personalizedHtml,
          text: personalizedText || undefined,
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          // Tag pro Resend dashboard filtrování
          tags: [
            { name: 'campaign_type', value: d.campaign_type },
            { name: 'draft_id', value: draftId.slice(0, 30) },
          ],
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        id?: string
        message?: string
      }

      if (!res.ok) {
        result.totalFailed++
        result.errors.push(`${signup.email}: ${data.message ?? 'unknown'}`)
        if (sendRow) {
          await supabaseAdmin
            .from('newsletter_sends')
            .update({
              status: 'failed',
              error_message: data.message ?? `HTTP ${res.status}`,
            })
            .eq('id', sendRow.id)
        }
      } else {
        result.totalSent++
        if (sendRow) {
          await supabaseAdmin
            .from('newsletter_sends')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              resend_message_id: data.id ?? null,
            })
            .eq('id', sendRow.id)
        }
      }
    } catch (err) {
      result.totalFailed++
      result.errors.push(`${signup.email}: ${err instanceof Error ? err.message : 'fetch error'}`)
    }

    // Polite rate limit (10/sec free tier = 100ms)
    await new Promise((r) => setTimeout(r, 110))
  }

  // 5. Označ draft jako sent
  await supabaseAdmin
    .from('newsletter_drafts')
    .update({
      status: result.totalFailed > result.totalSent ? 'failed' : 'sent',
      recipient_count: result.totalSent,
    })
    .eq('id', draftId)

  // 6. Update last_emailed_at na recipients (pro frequency control)
  const successEmails = targets
    .slice(0, result.totalSent)
    .map((s) => s.email)
  if (successEmails.length > 0) {
    await supabaseAdmin
      .from('newsletter_signups')
      .update({ last_emailed_at: new Date().toISOString() })
      .in('email', successEmails)
  }

  return result
}

/**
 * Pošli single test email — bez tracking, bez DB záznamu.
 * Pro admin "preview" tlačítko.
 */
export async function sendTestEmail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not set' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [opts.to],
        subject: `[TEST] ${opts.subject}`,
        html: opts.html.replace(
          /\{\{UNSUBSCRIBE_URL\}\}/g,
          `${SITE_URL}/api/newsletter/unsubscribe?token=test`
        ),
        text: opts.text,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) {
      return { ok: false, error: data.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, messageId: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'fetch error' }
  }
}
