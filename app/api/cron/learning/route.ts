import { NextRequest, NextResponse } from 'next/server'
import { runLearningExtraction } from '@/lib/learning-agent'
import { checkCronAuth } from '@/lib/cron-auth'

export const maxDuration = 600
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  try {
    const result = await runLearningExtraction({ hoursBack: 24 * 7 })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/learning]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
