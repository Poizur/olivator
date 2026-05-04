import { NextRequest, NextResponse } from 'next/server'
import { runRadarAgent } from '@/lib/radar-agent'
import { checkCronAuth } from '@/lib/cron-auth'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/** Cron-triggered radar run. Auth: x-cron-secret HEADER only. */
export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  try {
    const result = await runRadarAgent({ hoursBack: 4, maxItems: 5 })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/radar]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
