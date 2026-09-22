// Dedikovaný cron endpoint pro Reckonasbavi Complete XML sync (PASS 6 standalone).
// Spouštět 04:15 UTC — po feed-sync (04:00) aby PASS 1 (Heureka) nezmazal action_price.
// Railway: přidat jako samostatnou cron service → npm run cron:complete-sync
// nebo GET /api/cron/complete-sync s x-cron-secret headerem.

import { NextRequest, NextResponse } from 'next/server'
import { syncReckonasbavyComplete } from '@/lib/reckonasbavi-complete-sync'
import { checkCronAuth } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  if (!process.env.RECKONASBAVI_COMPLETE_FEED_URL) {
    // Log to notification_log so weekly Claude Code task can see it's not configured
    await supabaseAdmin.from('notification_log').insert({
      recipient: 'internal',
      subject: '[complete-sync] RECKONASBAVI_COMPLETE_FEED_URL chybí v Railway env',
      type: 'complete_sync_skipped',
      html: 'PASS 6 přeskočen — env var není nastavena. /slevy nebude mít akční ceny.',
      delivery_status: 'skipped',
      created_at: new Date().toISOString(),
    }).then(() => {})  // fire-and-forget, non-fatal

    console.warn('[cron/complete-sync] RECKONASBAVI_COMPLETE_FEED_URL not set — aborting')
    return NextResponse.json(
      { ok: false, skipped: true, reason: 'RECKONASBAVI_COMPLETE_FEED_URL not configured' },
      { status: 200 }  // 200 so Railway doesn't retry as failure
    )
  }

  try {
    const result = await syncReckonasbavyComplete()
    if (!result) {
      return NextResponse.json({ ok: false, skipped: true })
    }

    if (result.errors.length > 0) {
      console.warn('[cron/complete-sync] completed with errors:', result.errors)
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/complete-sync]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
