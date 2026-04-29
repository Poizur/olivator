import { NextRequest, NextResponse } from 'next/server'
import { runDiscoveryAgent } from '@/lib/discovery-agent'
import { sendDiscoverySummary } from '@/lib/email'
import { checkCronAuth } from '@/lib/cron-auth'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/** Cron-triggered discovery run. Auth: x-cron-secret HEADER only
 *  (žádný query string — logoval by se v CDN/Railway access logs). */
export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

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
