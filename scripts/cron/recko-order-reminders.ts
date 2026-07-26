/**
 * Recko order reminders cron.
 * Volá check_order_reminders.php — ten zkontroluje intervaly objednávek
 * a pošle upomínkový email dodavatelům podle nastavení v DB.
 *
 * Railway: cron service, schedule 0 6 * * * (6:00 Praha = 4:00 UTC v létě)
 * Local: npm run cron:recko-order-reminders
 */

const ENDPOINT = 'https://reckonasbavi.cz/aplikace/check_order_reminders.php?token=recko_sync_2025'
const TIMEOUT_MS = 30_000

async function main() {
  console.log('[recko-order-reminders] start', new Date().toISOString())

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(ENDPOINT, { signal: controller.signal })
    clearTimeout(timer)
    const text = await res.text()
    console.log('[recko-order-reminders] response:', text)
    if (!res.ok) {
      console.error('[recko-order-reminders] HTTP error', res.status)
      process.exit(1)
    }
  } catch (err) {
    clearTimeout(timer)
    console.error('[recko-order-reminders] fetch failed:', err)
    process.exit(1)
  }

  console.log('[recko-order-reminders] done', new Date().toISOString())
  process.exit(0)
}

main()
