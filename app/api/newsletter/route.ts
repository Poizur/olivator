import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

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
    try {
      // Načti existující řádek aby se zachoval token (pokud existuje)
      const { data: existing } = await supabaseAdmin
        .from('newsletter_signups')
        .select('id, unsubscribe_token')
        .eq('email', email)
        .maybeSingle()

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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[newsletter]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
