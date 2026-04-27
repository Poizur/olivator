import { NextRequest, NextResponse } from 'next/server'
import { runProspector } from '@/lib/prospector'
import { getSetting } from '@/lib/settings'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/** Weekly prospector cron — finds new e-shops, adds as 'suggested'.
 *  Authenticated by X-Cron-Secret header (or ?secret query param). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const provided =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runProspector()

    // Send email summary if we found any new shops + RESEND configured
    if (result.newlyAdded > 0) {
      try {
        const recipient = await getSetting<string>('notification_email')
        if (recipient && process.env.RESEND_API_KEY) {
          const html = `<!DOCTYPE html>
<html lang="cs"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fafafa">
<div style="background:white;border-radius:12px;padding:32px;border:1px solid #e8e8ed">
  <h1 style="font-size:22px;color:#2d6a4f;margin:0 0 8px">🌿 Olivator Prospector</h1>
  <p style="color:#6e6e73;font-size:14px;margin:0 0 24px">Týdenní hledání nových e-shopů</p>

  <div style="background:#d8f3dc;border-left:4px solid #2d6a4f;padding:12px 16px;border-radius:6px;margin-bottom:16px">
    <strong>✨ Nalezeno ${result.newlyAdded} nových e-shopů</strong>
    <div style="font-size:12px;color:#1b4332;margin-top:4px">${result.testedSuccess} crawler funguje, ${result.alreadyKnown} už máš v registru.</div>
  </div>

  <h2 style="font-size:16px;color:#1d1d1f;margin:24px 0 8px">Nové návrhy</h2>
  <ul style="font-size:13px;line-height:1.6;color:#1d1d1f">
    ${result.added.map(s =>
      `<li><strong>${s.name}</strong> · ${s.urlsFound} olejů ${s.error ? `<span style="color:#c00">(test selhal)</span>` : '✓'}</li>`
    ).join('')}
  </ul>

  <div style="text-align:center;margin-top:24px">
    <a href="https://olivator.cz/admin/discovery/sources" style="display:inline-block;background:#2d6a4f;color:white;text-decoration:none;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:500">
      Otevřít Zdroje →
    </a>
  </div>

  <p style="font-size:11px;color:#aeaeb2;margin-top:32px;border-top:1px solid #e8e8ed;padding-top:16px">
    Návrhy mají status "suggested" — ručně schválíš co aktivovat.
  </p>
</div>
</body></html>`.trim()

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || 'Olivator <onboarding@resend.dev>',
              to: [recipient],
              subject: `[Olivator] Prospector: ${result.newlyAdded} nových e-shopů`,
              html,
            }),
          })
          await supabaseAdmin.from('notification_log').insert({
            recipient,
            subject: `[Olivator] Prospector: ${result.newlyAdded} nových e-shopů`,
            type: 'prospector_summary',
            body_preview: html.slice(0, 500),
            delivery_status: 'sent',
          })
        }
      } catch (err) {
        console.warn('[cron/prospect] email failed:', err)
      }
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
