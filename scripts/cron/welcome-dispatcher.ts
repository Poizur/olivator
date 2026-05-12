// Cron: denně 9:00 UTC — odesílá welcome série emaily ze welcome_series_queue.
// Volá se z railway.toml nebo jako npm run cron:welcome-dispatcher.

import { dispatchWelcomeQueue } from '@/lib/welcome-series'

async function main() {
  console.log('[welcome-dispatcher] start', new Date().toISOString())
  const { sent, failed } = await dispatchWelcomeQueue()
  console.log(`[welcome-dispatcher] done — sent: ${sent}, failed: ${failed}`)
}

main().catch(err => {
  console.error('[welcome-dispatcher] FATAL:', err)
  process.exit(1)
})
