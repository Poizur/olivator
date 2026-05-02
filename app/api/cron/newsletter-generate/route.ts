// Cron: vygeneruje týdenní draft newsletteru.
// Schedule: středa 18:00 UTC (= čtvrtek brzo ráno) — admin má čas schválit
// před čtvrtkem 8:00 odesílání.
//
// Bezpečnost: vyžaduje X-Cron-Secret header s hodnotou CRON_SECRET env var.

import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyDraft } from '@/lib/newsletter-composer'
import { getSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // hook generation + render ~30-60s

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true // no secret configured → allow (dev)
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  return provided === expected
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Master switch
  const masterEnabled = await getSetting<boolean>('newsletter_enabled')
  if (!masterEnabled) {
    return NextResponse.json({ ok: false, skipped: 'newsletter_enabled = false' })
  }

  const weeklyEnabled = await getSetting<boolean>('newsletter_weekly_enabled')
  if (!weeklyEnabled) {
    return NextResponse.json({ ok: false, skipped: 'newsletter_weekly_enabled = false' })
  }

  try {
    const result = await generateWeeklyDraft()
    return NextResponse.json({
      ok: true,
      draftId: result.id,
      subject: result.subject,
    })
  } catch (err) {
    console.error('[cron/newsletter-generate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

// GET pro snadné manuální spuštění z prohlížeče (s ?secret=xxx)
export async function GET(req: NextRequest) {
  return POST(req)
}
