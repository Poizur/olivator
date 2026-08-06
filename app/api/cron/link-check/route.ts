import { NextRequest, NextResponse } from 'next/server'
import { runLinkRotCheck } from '@/lib/link-rot-checker'
import { checkCronAuth } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTrackingAlert } from '@/lib/email'

export const maxDuration = 600
export const dynamic = 'force-dynamic'

const TRACKING_WINDOW_HOURS = 24

/** Dead-man's switch: pokud 0 organických kliků za posledních N hodin, pošli alert. */
async function checkTrackingHealth(): Promise<{ organicCount: number; alerted: boolean }> {
  const cutoff = new Date(Date.now() - TRACKING_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('id', { count: 'exact', head: true })
    .eq('is_test', false)
    .gte('clicked_at', cutoff)

  const organicCount = count ?? 0
  if (organicCount > 0) return { organicCount, alerted: false }

  // 0 kliků — zjisti kdy byl poslední a pošli alert
  const { data: lastClick } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('clicked_at')
    .eq('is_test', false)
    .order('clicked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  await sendTrackingAlert({
    windowHours: TRACKING_WINDOW_HOURS,
    lastClickAt: (lastClick?.clicked_at as string | null) ?? null,
  })
  return { organicCount: 0, alerted: true }
}

/** Cron-triggered link rot checker. Auth: x-cron-secret HEADER only. */
export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  try {
    const [linkResult, trackingResult] = await Promise.all([
      runLinkRotCheck(),
      checkTrackingHealth(),
    ])
    return NextResponse.json({ ok: true, ...linkResult, tracking: trackingResult })
  } catch (err) {
    console.error('[cron/link-check]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
