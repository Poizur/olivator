import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { runManagerAgent } from '@/lib/manager-agent'
import { sendManagerReport } from '@/lib/email'

export const maxDuration = 120

/** Manuální spuštění Manager agenta z admin UI. Vrací report. */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }
  try {
    const { reportId, report } = await runManagerAgent()
    // Send email best-effort, don't block response on email failures
    try {
      await sendManagerReport(report)
    } catch (err) {
      console.warn('[manager/run] email send failed:', err)
    }
    return NextResponse.json({ ok: true, reportId, report })
  } catch (err) {
    console.error('[manager/run]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
