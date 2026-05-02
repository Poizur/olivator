// Cron: odešle všechny approved drafty.
// Schedule: čtvrtek 8:00 UTC.
//
// Pokud newsletter_auto_send = false (default), odešle pouze drafty
// ručně schválené adminem (status='approved'). Pokud true, taky 'draft'.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSetting } from '@/lib/settings'
import { sendDraft } from '@/lib/newsletter-sender'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  return provided === expected
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const masterEnabled = await getSetting<boolean>('newsletter_enabled')
  if (!masterEnabled) {
    return NextResponse.json({ ok: false, skipped: 'newsletter_enabled = false' })
  }

  const autoSend = await getSetting<boolean>('newsletter_auto_send')
  const allowedStatuses = autoSend ? ['draft', 'approved'] : ['approved']

  // Najdi drafty čekající na odeslání (max 3 najednou — pojistka)
  const { data: drafts } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('id, subject, campaign_type, status')
    .in('status', allowedStatuses)
    .order('generated_at', { ascending: true })
    .limit(3)

  if (!drafts || drafts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No drafts to send' })
  }

  const results = []
  for (const draft of drafts) {
    // Ujisti se že je approved (sendDraft to znovu zkontroluje)
    if (draft.status === 'draft' && autoSend) {
      await supabaseAdmin
        .from('newsletter_drafts')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: 'cron-auto' })
        .eq('id', draft.id)
    }

    const r = await sendDraft(draft.id as string)
    results.push({
      draftId: draft.id,
      subject: draft.subject,
      ok: r.ok,
      sent: r.totalSent,
      failed: r.totalFailed,
    })
  }

  return NextResponse.json({ ok: true, drafts: results })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
