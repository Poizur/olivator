/**
 * Newsletter Generate cron — vygeneruje týdenní draft a pošle notifikaci adminovi.
 *
 * Railway Cron Job: středa 18:00 UTC (= 20:00 CEST)
 * Local: npm run cron:newsletter-generate
 */
import { generateWeeklyDraft } from '@/lib/newsletter-composer'
import { getSetting } from '@/lib/settings'
import { sendTransactionalEmail } from '@/lib/newsletter-sender'

const MAX_RUNTIME_MS = 3 * 60 * 1000 // 3 min — Claude hook generation

async function main() {
  const startedAt = Date.now()
  console.log('[cron:newsletter-generate] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:newsletter-generate] TIMEOUT — exceeded 3 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await generateWeeklyDraft()
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:newsletter-generate] done in ${elapsedSec}s, draftId=${result.id}, subject="${result.subject}"`)
    if (result.pinnedProductUsed) {
      console.log(`[cron:newsletter-generate] pinned product used: ${result.pinnedProductUsed}`)
    }

    // Notifikace adminovi
    const notifyEmail = await getSetting<string>('notification_email').catch(() => null)
    if (notifyEmail) {
      const draftUrl = `https://olivator.cz/admin/newsletter/drafts/${result.id}`
      const pinnedNote = result.pinnedProductUsed
        ? `<p>📌 Pinned produkt použit jako Olej týdne: <strong>${result.pinnedProductUsed}</strong></p>`
        : ''
      await sendTransactionalEmail({
        to: notifyEmail,
        subject: `[Olivator] Newsletter draft čeká na schválení: ${result.subject}`,
        html: `<p>Týdenní newsletter draft byl vygenerován a čeká na tvoje schválení.</p><p><strong>Předmět:</strong> ${result.subject}</p>${pinnedNote}<p><a href="${draftUrl}">Zobrazit a schválit draft →</a></p><p>Odesílání je naplánováno na čtvrtek 8:00 UTC.</p>`,
        text: `Newsletter draft čeká na schválení.\nPředmět: ${result.subject}\nOdkaz: ${draftUrl}`,
      }).catch((err) => console.warn('[cron:newsletter-generate] notify email failed:', err))
      console.log(`[cron:newsletter-generate] notification sent to ${notifyEmail}`)
    }

    clearTimeout(killTimer)
    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[cron:newsletter-generate] FAILED:', err)
    process.exit(1)
  }
}

main()
