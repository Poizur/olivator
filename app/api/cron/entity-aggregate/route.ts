import { NextRequest, NextResponse } from 'next/server'
import { recomputeAllCultivars } from '@/lib/entity-aggregator'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/** Cron-triggered entity aggregator. Přepočítává cultivar.flavor_profile
 *  a intensity_score z aktuálních produktů. Respektuje admin override
 *  (auto_filled_at IS NULL = nepřepisuj). */
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
    const result = await recomputeAllCultivars()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/entity-aggregate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
