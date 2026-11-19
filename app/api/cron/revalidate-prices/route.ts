import { NextRequest, NextResponse } from 'next/server'
import { checkCronAuth } from '@/lib/cron-auth'
import { revalidatePricePages } from '@/lib/price-revalidation'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/** Obnoví /, /slevy, žebříčky a stránky olejů se změnou ceny od `since` (výchozí: posledních 24 h).
 *  Volají cron skripty po synchronizaci cen a server sám po startu (nasazení). Auth: x-cron-secret. */
export async function POST(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  const body = (await request.json().catch(() => ({}))) as { since?: string; reason?: string }
  const sinceMs = body.since ? Date.parse(body.since) : NaN
  const since = new Date(Number.isFinite(sinceMs) ? sinceMs : Date.now() - 24 * 3600_000).toISOString()
  try {
    const result = await revalidatePricePages({ since, reason: (body.reason ?? 'manual').slice(0, 40) })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/revalidate-prices]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
