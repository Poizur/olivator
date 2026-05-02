// POST — pošle draft do admin emailu (pro preview).
// Body: { email } — jinak fallback na notification_email setting.

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTestEmail } from '@/lib/newsletter-sender'
import { getSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const customEmail: string | undefined = body.email
    const adminEmail = await getSetting<string>('notification_email')
    const target = customEmail || adminEmail

    if (!target || !target.includes('@')) {
      return NextResponse.json(
        { error: 'Žádný cílový email — zadej v query nebo nastav notification_email' },
        { status: 400 }
      )
    }

    const { data: draft } = await supabaseAdmin
      .from('newsletter_drafts')
      .select('subject, html_body, text_body')
      .eq('id', id)
      .maybeSingle()

    if (!draft) {
      return NextResponse.json({ error: 'Draft nenalezen' }, { status: 404 })
    }

    const result = await sendTestEmail({
      to: target,
      subject: draft.subject as string,
      html: draft.html_body as string,
      text: (draft.text_body as string) ?? undefined,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true, target })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
