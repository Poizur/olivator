// Cron: denně 9:00 UTC — odesílá welcome série emaily ze welcome_series_queue.
// Ve čtvrtek navíc auto-send týdenního newsletteru (draft ze středy 18:00).
// Volá se z railway.toml nebo jako npm run cron:welcome-dispatcher.

import { dispatchWelcomeQueue } from '@/lib/welcome-series'
import { autoSendWeeklyNewsletter } from '@/lib/newsletter-auto-send'

async function main() {
  console.log('[welcome-dispatcher] start', new Date().toISOString())
  const { sent, failed } = await dispatchWelcomeQueue()
  console.log(`[welcome-dispatcher] done — sent: ${sent}, failed: ${failed}`)

  if (new Date().getUTCDay() === 4) {
    try {
      const r = await autoSendWeeklyNewsletter()
      console.log('[welcome-dispatcher] newsletter auto-send:', JSON.stringify(r))
    } catch (err) {
      console.error('[welcome-dispatcher] newsletter auto-send FAILED:', err)
    }
  }
}

main().catch(err => {
  console.error('[welcome-dispatcher] FATAL:', err)
  process.exit(1)
})
