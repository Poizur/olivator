import { NextRequest, NextResponse } from 'next/server'
import { runGscDailySnapshot } from '@/lib/gsc'
import { checkCronAuth } from '@/lib/cron-auth'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/** GSC daily snapshot. Volá ho feed-sync PASS 7 — cron služby nemají GSC klíče,
 *  web ano. Auth: x-cron-secret HEADER only. */
export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  const result = await runGscDailySnapshot()
  if (!result) {
    return NextResponse.json({ error: 'GSC snapshot failed or GSC not configured' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ...result })
}
