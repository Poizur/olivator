import { NextRequest, NextResponse } from 'next/server'
import { runLinkRotCheck } from '@/lib/link-rot-checker'
import { checkCronAuth } from '@/lib/cron-auth'

export const maxDuration = 600
export const dynamic = 'force-dynamic'

/** Cron-triggered link rot checker. Auth: x-cron-secret HEADER only. */
export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  try {
    const result = await runLinkRotCheck()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/link-check]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
