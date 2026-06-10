/**
 * Newsletter Send cron — odešle schválené drafty subscriberům.
 *
 * Railway Cron Job: čtvrtek 8:00 UTC (= 10:00 CEST)
 * Local: npm run cron:newsletter-send
 */
import { supabaseAdmin } from '@/lib/supabase'
import { getSetting } from '@/lib/settings'

const MAX_RUNTIME_MS = 10 * 60 * 1000

async function main() {
  const startedAt = Date.now()
  console.log('[cron:newsletter-send] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:newsletter-send] TIMEOUT — exceeded 10 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const autoSend = await getSetting<boolean>('newsletter_auto_send').catch(() => false)
    if (!autoSend) {
      console.log('[cron:newsletter-send] newsletter_auto_send = false — skipping auto-send (admin schvaluje ručně)')
      clearTimeout(killTimer)
      process.exit(0)
    }

    const { data: drafts } = await supabaseAdmin
      .from('newsletter_drafts')
      .select('id, subject')
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    if (!drafts || drafts.length === 0) {
      console.log('[cron:newsletter-send] no approved drafts to send')
      clearTimeout(killTimer)
      process.exit(0)
    }

    console.log(`[cron:newsletter-send] found ${drafts.length} approved draft(s)`)

    for (const draft of drafts) {
      const res = await fetch(`https://olivator.cz/api/admin/newsletter/drafts/${draft.id}/send`, {
        method: 'POST',
        headers: {
          'x-cron-secret': process.env.CRON_SECRET ?? '',
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      if (res.ok) {
        console.log(`[cron:newsletter-send] draft ${draft.id} sent — totalSent=${data.totalSent}, totalFailed=${data.totalFailed}`)
      } else {
        console.error(`[cron:newsletter-send] draft ${draft.id} FAILED:`, data.error)
      }
    }

    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:newsletter-send] done in ${elapsedSec}s`)
    clearTimeout(killTimer)
    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[cron:newsletter-send] FAILED:', err)
    process.exit(1)
  }
}

main()
