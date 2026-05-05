import { NextRequest, NextResponse } from 'next/server'
import { runDiscoveryAgent } from '@/lib/discovery-agent'
import { sendDiscoverySummary } from '@/lib/email'
import { checkCronAuth } from '@/lib/cron-auth'

// 21 enabled shops × Playwright crawl + auto-rescrape pro nové drafty
// (~30-60s per shop, plus 30-90s per nový produkt). 800s = Railway max
// pro většinu plánů. Pokud běh přesáhne, kill timer v scripts/cron/
// discovery.ts (30 min) ho zachytí a process.exit(2) z standalone runner.
export const maxDuration = 800
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
