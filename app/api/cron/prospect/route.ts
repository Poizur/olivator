import { NextRequest, NextResponse } from 'next/server'
import { runProspector } from '@/lib/prospector'
import { sendProspectorSummary } from '@/lib/email'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/** HTTP-triggered prospector run.
 *  Authenticated by X-Cron-Secret header (or ?secret query param).
 *  Used for: (a) manual "Run now" from admin, (b) external cron fallback.
 *  Production cron prefers standalone runner: scripts/cron/prospect.ts */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const provided =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runProspector()

    try {
      await sendProspectorSummary(result)
    } catch (err) {
      console.warn('[cron/prospect] email failed:', err)
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
