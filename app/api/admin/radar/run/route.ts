import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { runRadarAgent } from '@/lib/radar-agent'

// Admin-only manuální trigger pro Radar Agent. Bez CRON_SECRET — auth
// jde přes admin session cookie. Použito v /admin/novinky tlačítkem.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runRadarAgent({ hoursBack: 24, maxItems: 10 })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[admin/radar/run]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
