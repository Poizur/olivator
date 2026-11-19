import { NextRequest, NextResponse } from 'next/server'
import { runFeedSyncForAllRetailers } from '@/lib/feed-sync-runner'
import { checkCronAuth } from '@/lib/cron-auth'
import { revalidatePricePages } from '@/lib/price-revalidation'

// 700+ položek per retailer × N retailerů → potřebujeme prostor.
// Heureka XML je rychlé (~30s/shop), ale 5 shopů × DB roundtripy nás zavedou
// klidně k 5 minutám. 300s je rozumný strop pro vícero retailerů.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/** Cron-triggered XML feed sync. Auth: x-cron-secret HEADER only
 *  (žádný query string — logoval by se v CDN/Railway access logs). */
export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  try {
    const since = new Date().toISOString()
    const result = await runFeedSyncForAllRetailers()
    const revalidation = await revalidatePricePages({ since, reason: 'api:feed-sync' }).catch((e: Error) => ({ error: e.message }))
    return NextResponse.json({ ok: true, ...result, revalidation })
  } catch (err) {
    console.error('[cron/feed-sync]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
