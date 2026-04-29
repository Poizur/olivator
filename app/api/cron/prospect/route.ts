import { NextRequest, NextResponse } from 'next/server'
import { runProspector } from '@/lib/prospector'
import { sendProspectorSummary } from '@/lib/email'
import { checkCronAuth } from '@/lib/cron-auth'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/** HTTP-triggered prospector run. Auth: x-cron-secret HEADER only. */
export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

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
