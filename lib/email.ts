// Email notifications via Resend.com
// If RESEND_API_KEY is missing, emails are logged to notification_log only
// (so no emails actually sent — useful in dev / when admin hasn't signed up yet).

import { supabaseAdmin } from './supabase'
import { getSetting } from './settings'
import type { DiscoveryRunResult } from './discovery-agent'

const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Olivator <onboarding@resend.dev>'

interface SendResult {
  ok: boolean
  delivered: boolean
  error?: string
}

async function sendViaResend(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: true,
      delivered: false,
      error: 'RESEND_API_KEY not set — email logged but not sent',
    }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const error = await res.text().catch(() => 'Resend error')
      return { ok: false, delivered: false, error: error.slice(0, 200) }
    }
    return { ok: true, delivered: true }
  } catch (err) {
    return {
      ok: false,
      delivered: false,
      error: err instanceof Error ? err.message : 'Fetch failed',
    }
  }
}

async function logNotification(
  recipient: string,
  subject: string,
  type: string,
  bodyPreview: string,
  result: SendResult
): Promise<void> {
  try {
    await supabaseAdmin.from('notification_log').insert({
      recipient,
      subject,
      type,
      body_preview: bodyPreview.slice(0, 500),
      delivery_status: result.delivered ? 'sent' : 'failed',
      delivery_error: result.error ?? null,
    })
  } catch {
    // table missing — silent
  }
}

/** Send bulk job completion email — short summary after admin's bulk approve. */
export async function sendBulkJobCompletionEmail(jobInfo: {
  type: string
  total: number
  succeeded: number
  failed: number
  errors: Array<{ id: string; reason: string }>
  durationSec: number
}): Promise<void> {
  const recipient = await getSetting<string>('notification_email')
  if (!recipient) return

  const typeLabel = jobInfo.type === 'discovery_bulk_approve'
    ? 'Hromadné schválení'
    : jobInfo.type
  const subject = `[Olivator] ${typeLabel} hotovo · ${jobInfo.succeeded}/${jobInfo.total}`

  const minutes = Math.floor(jobInfo.durationSec / 60)
  const seconds = jobInfo.durationSec % 60
  const durationLabel = minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`

  const html = `<!DOCTYPE html>
<html lang="cs"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fafafa">
<div style="background:white;border-radius:12px;padding:32px;border:1px solid #e8e8ed">
  <h1 style="font-size:20px;color:#2d6a4f;margin:0 0 8px">✓ ${typeLabel} dokončeno</h1>
  <p style="color:#6e6e73;font-size:14px;margin:0 0 24px">Trvalo ${durationLabel}</p>

  <div style="background:#f5f5f7;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="font-size:13px;line-height:1.8">
      ✅ <strong>${jobInfo.succeeded}</strong> úspěšně publikováno<br>
      ${jobInfo.failed > 0 ? `❌ <strong style="color:#c00">${jobInfo.failed}</strong> selhalo` : ''}
    </div>
  </div>

  ${
    jobInfo.errors.length > 0
      ? `<div style="background:#fee;border-left:4px solid #c00;padding:12px 16px;border-radius:6px;margin-bottom:16px">
          <strong>Chyby:</strong>
          <ul style="font-size:12px;color:#600;margin:6px 0 0;padding-left:20px">
            ${jobInfo.errors.slice(0, 5).map(e => `<li>${e.reason}</li>`).join('')}
            ${jobInfo.errors.length > 5 ? `<li style="font-style:italic">…a ${jobInfo.errors.length - 5} dalších</li>` : ''}
          </ul>
        </div>`
      : ''
  }

  <div style="text-align:center;margin-top:24px">
    <a href="https://olivator.cz/admin/discovery" style="display:inline-block;background:#2d6a4f;color:white;text-decoration:none;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:500">
      Otevřít Návrhy →
    </a>
  </div>
</div>
</body></html>`.trim()

  const sendResult = await sendViaResend(recipient, subject, html)
  await logNotification(recipient, subject, 'bulk_job_completion', html, sendResult)
}

/** Send discovery run summary email. */
export async function sendDiscoverySummary(result: DiscoveryRunResult): Promise<void> {
  const recipient = await getSetting<string>('notification_email')
  if (!recipient) return

  const subject = `[Olivator] Discovery: ${result.autoPublished} publikováno · ${result.needsReview} ke schválení`

  const html = renderDiscoveryHTML(result)
  const sendResult = await sendViaResend(recipient, subject, html)
  await logNotification(recipient, subject, 'discovery_summary', html, sendResult)
}

function renderDiscoveryHTML(r: DiscoveryRunResult): string {
  const baseUrl = 'https://olivator.cz'
  const queueUrl = `${baseUrl}/admin/discovery`

  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1d1d1f;max-width:600px;margin:0 auto;padding:24px;background:#fafafa">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e8e8ed">
    <h1 style="font-size:22px;color:#2d6a4f;margin:0 0 8px">🌿 Olivator Discovery</h1>
    <p style="color:#6e6e73;font-size:14px;margin:0 0 24px">Týdenní souhrn z agenta</p>

    <div style="background:#f5f5f7;border-radius:8px;padding:16px;margin-bottom:24px">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:13px">
        <tr><td style="padding:4px 0">🕷 E-shopů scanováno</td><td align="right"><strong>${r.shopsCrawled}</strong></td></tr>
        <tr><td style="padding:4px 0">🔍 URL nalezeno</td><td align="right"><strong>${r.totalUrlsFound}</strong></td></tr>
        <tr><td style="padding:4px 0">🆕 Nových kandidátů</td><td align="right"><strong>${r.newCandidates}</strong></td></tr>
      </table>
    </div>

    ${
      r.autoPublished > 0
        ? `<div style="background:#d8f3dc;border-left:4px solid #2d6a4f;padding:12px 16px;border-radius:6px;margin-bottom:16px">
            <strong>✅ Auto-publikováno: ${r.autoPublished}</strong>
            <div style="font-size:12px;color:#1b4332;margin-top:4px">Produkty s plnými daty + AI texty.</div>
          </div>`
        : ''
    }
    ${
      r.autoAddedOffers > 0
        ? `<div style="background:#e8f5e9;border-left:4px solid #40916c;padding:12px 16px;border-radius:6px;margin-bottom:16px">
            <strong>🔗 Nové nabídky pro existující produkty: ${r.autoAddedOffers}</strong>
            <div style="font-size:12px;margin-top:4px">EAN match — připojeno k existujícímu produktu.</div>
          </div>`
        : ''
    }
    ${
      r.needsReview > 0
        ? `<div style="background:#fff3cd;border-left:4px solid #c4711a;padding:12px 16px;border-radius:6px;margin-bottom:16px">
            <strong>⏳ Čeká na schválení: ${r.needsReview}</strong>
            <div style="font-size:12px;color:#5a3a0a;margin-top:4px">Možný duplikát nebo neúplná data — projdi v queue.</div>
          </div>`
        : ''
    }
    ${
      r.failed > 0
        ? `<div style="background:#fee;border-left:4px solid #c00;padding:12px 16px;border-radius:6px;margin-bottom:16px">
            <strong>❌ Selhalo: ${r.failed}</strong>
            <div style="font-size:12px;color:#600;margin-top:4px">${r.errors.slice(0, 3).join('<br>')}</div>
          </div>`
        : ''
    }
    ${
      r.shopErrors.length > 0
        ? `<div style="background:#fee;border-left:4px solid #c00;padding:12px 16px;border-radius:6px;margin-bottom:16px">
            <strong>🚨 E-shopy selhaly:</strong>
            <ul style="font-size:12px;color:#600;margin:6px 0 0;padding-left:20px">
              ${r.shopErrors.map(e => `<li>${e.shop}: ${e.error}</li>`).join('')}
            </ul>
          </div>`
        : ''
    }

    <div style="text-align:center;margin-top:24px">
      <a href="${queueUrl}" style="display:inline-block;background:#2d6a4f;color:white;text-decoration:none;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:500">
        Otevřít queue →
      </a>
    </div>

    <p style="font-size:11px;color:#aeaeb2;margin-top:32px;border-top:1px solid #e8e8ed;padding-top:16px">
      Tento email se posílá z Discovery agenta automaticky. Frekvenci a příjemce upravíš v
      <a href="${baseUrl}/admin/nastaveni" style="color:#2d6a4f">Nastavení</a>.
    </p>
  </div>
</body>
</html>`.trim()
}
