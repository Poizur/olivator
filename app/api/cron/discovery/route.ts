import { NextRequest, NextResponse } from 'next/server'
import { runDiscoveryAgent } from '@/lib/discovery-agent'
import { sendDiscoverySummary } from '@/lib/email'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/** Cron-triggered discovery run. Authenticated by X-Cron-Secret header
 *  (or ?secret query param) matching CRON_SECRET env. Railway cron service
 *  hits this endpoint on schedule defined in railway.toml or env. */
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
    const result = await runDiscoveryAgent()

    // Send email summary (best-effort, doesn't block)
    try {
      await sendDiscoverySummary(result)
    } catch (err) {
      console.warn('[cron/discovery] email send failed:', err)
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/discovery]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
