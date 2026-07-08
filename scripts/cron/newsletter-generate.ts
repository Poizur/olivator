/**
 * Newsletter Generate cron — vygeneruje týdenní draft a pošle notifikaci adminovi.
 *
 * Railway Cron Job: středa 18:00 UTC (= 20:00 CEST)
 * Local: npm run cron:newsletter-generate
 */
import { generateWeeklyDraft } from '@/lib/newsletter-composer'
import { runNewsletterReview, patchDraftReviewerNotes } from '@/lib/newsletter-reviewer'
import { getSetting } from '@/lib/settings'
import { sendTransactionalEmail } from '@/lib/newsletter-sender'
import type { ReviewResult } from '@/lib/ai-reviewer'

const MAX_RUNTIME_MS = 5 * 60 * 1000 // 5 min — generace + Haiku reviewer

function buildReviewerHtml(review: ReviewResult): string {
  if (review.verdict === 'error') {
    return `
<div style="background:#fff3cd;border-left:4px solid #c4711a;padding:12px 16px;border-radius:6px;margin:16px 0">
  <strong>⚠️ AI reviewer nedostupný</strong> — draft neprošel automatickou kontrolou opakování.
  Doporučuji manuální review před sendem.
</div>`
  }

  if (review.verdict === 'ok' && review.issues.length === 0) {
    return `
<div style="background:#d8f3dc;border-left:4px solid #2d6a4f;padding:12px 16px;border-radius:6px;margin:16px 0">
  <strong>✅ AI Reviewer: OK</strong> — ${review.summary || 'Žádné opakující se vzorce nenalezeny.'}
</div>`
  }

  const issueRows = review.issues
    .map(i => {
      const icon = i.severity === 'info' ? 'ℹ️' : '⚠️'
      return `<li style="margin-bottom:4px">${icon} <strong>${i.rule}</strong>: ${i.detail}</li>`
    })
    .join('')

  return `
<div style="background:#fff8e6;border-left:4px solid #c4711a;padding:12px 16px;border-radius:6px;margin:16px 0">
  <strong>🔍 AI Reviewer: ${review.verdict.toUpperCase()}</strong><br>
  <span style="font-size:13px;color:#5a3a0a">${review.summary}</span>
  ${review.issues.length > 0 ? `<ul style="font-size:12px;margin:8px 0 0;padding-left:20px;color:#5a3a0a">${issueRows}</ul>` : ''}
</div>`
}

async function main() {
  const startedAt = Date.now()
  console.log('[cron:newsletter-generate] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:newsletter-generate] TIMEOUT — exceeded 5 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const result = await generateWeeklyDraft()
    console.log(`[cron:newsletter-generate] draft saved: id=${result.id}, subject="${result.subject}"`)
    if (result.pinnedProductUsed) {
      console.log(`[cron:newsletter-generate] pinned product used: ${result.pinnedProductUsed}`)
    }

    // Místo B — AI Reviewer (fail-open)
    let review: ReviewResult = { verdict: 'error', issues: [], summary: 'AI reviewer nedostupný — doporučuji manuální kontrolu před sendem.' }
    try {
      review = await runNewsletterReview(result.id)
      console.log(`[cron:newsletter-generate] reviewer: verdict=${review.verdict}, issues=${review.issues.length}`)
      await patchDraftReviewerNotes(result.id, review)
    } catch (reviewErr) {
      console.warn('[cron:newsletter-generate] reviewer failed (fail-open):', reviewErr)
    }

    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[cron:newsletter-generate] done in ${elapsedSec}s`)

    // Admin notification s reviewer reportem
    const notifyEmail = await getSetting<string>('notification_email').catch(() => null)
    if (notifyEmail) {
      const draftUrl = `https://olivator.cz/admin/newsletter/drafts/${result.id}`
      const pinnedNote = result.pinnedProductUsed
        ? `<p>📌 Pinned produkt použit jako Olej týdne: <strong>${result.pinnedProductUsed}</strong></p>`
        : ''
      await sendTransactionalEmail({
        to: notifyEmail,
        subject: `[Olivator] Newsletter draft čeká na schválení: ${result.subject}`,
        html: `
<p>Týdenní newsletter draft byl vygenerován a čeká na tvoje schválení.</p>
<p><strong>Předmět:</strong> ${result.subject}</p>
${pinnedNote}
${buildReviewerHtml(review)}
<p><a href="${draftUrl}">Zobrazit a schválit draft →</a></p>
<p>Odesílání probíhá manuálně přes admin.</p>`.trim(),
        text: `Newsletter draft čeká na schválení.\nPředmět: ${result.subject}\nReviewer: ${review.verdict} (${review.issues.length} issues)\n${review.summary}\nOdkaz: ${draftUrl}`,
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
