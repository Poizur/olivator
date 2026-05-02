// PATCH — update draft (subject, preheader, html_body, status='approved')
// DELETE — archive draft

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const allowed = ['subject', 'preheader', 'html_body', 'text_body']
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of allowed) {
      if (k in body) payload[k] = body[k]
    }
    if (Object.keys(payload).length === 1) {
      return NextResponse.json({ error: 'Žádné pole k aktualizaci' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('newsletter_drafts')
      .update(payload)
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

/** Smart delete:
 *  - draft/approved/failed/archived → HARD delete (DB row pryč)
 *  - sent/sending → SOFT archive (zachovej historii kampaně)
 *
 *  Důvod: odeslané kampaně musíme držet kvůli stats (open/click rate),
 *  ale neodeslané drafty co už nepotřebujeme = clutter, smažeme natvrdo.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params

    // Zjisti current status
    const { data: existing } = await supabaseAdmin
      .from('newsletter_drafts')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Draft nenalezen' }, { status: 404 })
    }

    const status = existing.status as string
    const HARD_DELETABLE = ['draft', 'approved', 'failed', 'archived']

    if (HARD_DELETABLE.includes(status)) {
      // Hard delete — newsletter_sends + newsletter_events smažou se kaskádou (FK CASCADE)
      const { error } = await supabaseAdmin
        .from('newsletter_drafts')
        .delete()
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true, mode: 'hard' })
    }

    // Sent/sending → archivovat (zachovat data)
    const { error } = await supabaseAdmin
      .from('newsletter_drafts')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true, mode: 'soft' })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
