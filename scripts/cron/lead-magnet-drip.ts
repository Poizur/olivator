/**
 * cron:lead-magnet-drip
 * Denně 9:00 UTC — odesílá naplánované emaily z email_drip_queue.
 *
 * Série:
 *   1 → +3d: "3 nejčastější chyby při výběru olivového oleje"
 *   2 → +7d: "Který olej pro který účel?"
 *   3 → +14d: "Aktuální slevy" (live re-price data z DB)
 *
 * Email 0 (PDF ihned) odesílá /api/newsletter/confirm, ne tento skript.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { sendTransactionalEmail } from '@/lib/newsletter-sender'

const SITE = 'https://olivator.cz'
const DELAY_MS = 800

async function delay(ms: number) { await new Promise(r => setTimeout(r, ms)) }

function wrap(body: string, unsubUrl: string): string {
  return `<!DOCTYPE html><html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Helvetica Neue,Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
  <div style="background:#2d6a4f;padding:20px 36px;"><div style="color:#fff;font-size:16px;font-weight:700;">olivátor.cz</div></div>
  <div style="padding:32px 36px;">${body}</div>
  <div style="padding:14px 36px;background:#f5f5f7;border-top:1px solid #e8e8ed;">
    <p style="margin:0;font-size:12px;color:#878779;"><a href="${unsubUrl}" style="color:#2d6a4f;text-decoration:underline;">Odhlásit odběr</a> · olivátor.cz</p>
  </div>
</div></body></html>`
}

async function buildEmail(num: number, unsubUrl: string): Promise<{ subject: string; html: string; text: string }> {
  if (num === 1) {
    const body = `
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1a1a1a;line-height:1.3;">3 chyby, které dělá většina kupujících</h1>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.7;margin:0 0 20px;">Výběr olivového oleje je jednoduchý — jakmile znáte tyto tři pasti:</p>
      <div style="border-left:3px solid #c4711a;padding:12px 16px;margin:0 0 14px;background:#fdf0e2;">
        <strong style="font-size:14px;color:#1a1a1a;">1. „Light" neznamená lehčí</strong>
        <p style="color:#3d3d3d;font-size:14px;margin:6px 0 0;line-height:1.6;">Light olive oil je rafinovaný olej s neutrální chutí — bez polyfenolů, bez zdravotních benefitů. Extra panenský (EVOO) je vždy lepší volba.</p>
      </div>
      <div style="border-left:3px solid #c4711a;padding:12px 16px;margin:0 0 14px;background:#fdf0e2;">
        <strong style="font-size:14px;color:#1a1a1a;">2. Průhledná lahev ničí olej</strong>
        <p style="color:#3d3d3d;font-size:14px;margin:6px 0 0;line-height:1.6;">Světlo degraduje polyfenoly — za 3 měsíce na světle přijde olej o třetinu benefitů. Vybírejte tmavé sklo nebo plech.</p>
      </div>
      <div style="border-left:3px solid #c4711a;padding:12px 16px;margin:0 0 24px;background:#fdf0e2;">
        <strong style="font-size:14px;color:#1a1a1a;">3. Rok sklizně se ignoruje</strong>
        <p style="color:#3d3d3d;font-size:14px;margin:6px 0 0;line-height:1.6;">Olivový olej je nejlepší do 18 měsíců od sklizně. Starý „bio" z minulé sezóny porazí novým konvenčním. Hledejte rok sklizně na etiketě.</p>
      </div>
      <a href="${SITE}/srovnavac" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;margin-bottom:16px;">Srovnat aktuální oleje →</a>`

    return {
      subject: '3 chyby, které dělá většina kupujících olivového oleje',
      html: wrap(body, unsubUrl),
      text: `3 chyby:\n1. Light = rafinovaný, bez benefitů\n2. Průhledná lahev ničí polyfenoly\n3. Rok sklizně — max 18 měsíců\n\n${SITE}/srovnavac\n\nOdhlásit: ${unsubUrl}`,
    }
  }

  if (num === 2) {
    const body = `
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1a1a1a;line-height:1.3;">Který olivový olej na co?</h1>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.7;margin:0 0 20px;">Krátký přehled — uložte si ho.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px;">
        <tr style="background:#e8f3ec;"><th style="text-align:left;padding:10px 12px;color:#1b4332;">Použití</th><th style="text-align:left;padding:10px 12px;color:#1b4332;">Doporučeno</th></tr>
        <tr style="border-bottom:1px solid #e8e8ed;"><td style="padding:10px 12px;color:#3d3d3d;">Salát, dip, raw</td><td style="padding:10px 12px;font-weight:500;">Extra panenský, max polyfenoly</td></tr>
        <tr style="background:#f9f9f9;border-bottom:1px solid #e8e8ed;"><td style="padding:10px 12px;color:#3d3d3d;">Vaření (do 180 °C)</td><td style="padding:10px 12px;font-weight:500;">Extra panenský, levnější</td></tr>
        <tr style="border-bottom:1px solid #e8e8ed;"><td style="padding:10px 12px;color:#3d3d3d;">Smažení (180 °C+)</td><td style="padding:10px 12px;font-weight:500;">Rafinovaný nebo pomace</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:10px 12px;color:#3d3d3d;">Zdravotní záměr</td><td style="padding:10px 12px;font-weight:500;">EVOO 300+ mg/kg polyfenolů</td></tr>
      </table>
      <a href="${SITE}/zebricek" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">Žebříčky dle použití →</a>`

    return {
      subject: 'Který olivový olej na co? Rychlý přehled',
      html: wrap(body, unsubUrl),
      text: `Salát/raw: Extra panenský max poly\nVaření: Extra panenský levnější\nSmažení: Rafinovaný\nZdravotní: EVOO 300+ mg/kg\n\n${SITE}/zebricek\n\nOdhlásit: ${unsubUrl}`,
    }
  }

  // Email 3 — live slevy z DB
  let dealsHtml = ''
  try {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString()
    const { data: hist } = await supabaseAdmin
      .from('price_history')
      .select('product_id, retailer_id, price, recorded_at')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(300)

    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, retailer_id, price, products(slug,name,olivator_score), retailers(name)')
      .eq('in_stock', true)
      .not('affiliate_url', 'is', null)
      .limit(80)

    if (hist && offers) {
      const drops: Array<{ name: string; score: number; oldPrice: number; newPrice: number; drop: number; slug: string; retailer: string }> = []

      for (const o of offers) {
        const p = o.products as { slug: string; name: string; olivator_score: number } | null
        const r = o.retailers as { name: string } | null
        if (!p || !o.price || (p.olivator_score ?? 0) < 75) continue
        const related = hist.filter(h => h.product_id === o.product_id && h.retailer_id === o.retailer_id)
        if (!related.length) continue
        const oldPrice = Math.max(...related.map(h => h.price as number))
        const drop = (oldPrice - (o.price as number)) / oldPrice
        if (drop > 0.03) drops.push({ name: p.name, score: p.olivator_score, oldPrice, newPrice: o.price as number, drop, slug: p.slug, retailer: r?.name ?? '' })
      }

      drops.sort((a, b) => b.drop - a.drop)
      dealsHtml = drops.slice(0, 3).map(d => `
        <div style="border:1px solid #e8e8ed;border-radius:6px;padding:14px 16px;margin-bottom:12px;">
          <div style="font-size:11px;color:#2d6a4f;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Score ${d.score}</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:6px;">${d.name.slice(0, 70)}</div>
          <div style="font-size:13px;color:#c4711a;font-weight:700;">${d.newPrice} Kč <span style="color:#878779;font-weight:400;text-decoration:line-through;">${d.oldPrice} Kč</span> <span style="background:#fdf0e2;padding:1px 7px;border-radius:10px;font-size:12px;">−${Math.round(d.drop * 100)} %</span></div>
          <a href="${SITE}/olej/${d.slug}" style="display:inline-block;margin-top:8px;font-size:13px;color:#2d6a4f;font-weight:600;text-decoration:none;">Zobrazit →</a>
        </div>`).join('')
    }
  } catch { /* best-effort */ }

  if (!dealsHtml) {
    dealsHtml = `<div style="background:#e8f3ec;border-radius:6px;padding:14px 16px;"><p style="margin:0;font-size:14px;color:#1b4332;">Srovnáváme ceny u 18+ prodejců každých 24 hodin. Aktuální slevy najdete v srovnávači:</p><a href="${SITE}/srovnavac" style="display:inline-block;margin-top:8px;font-size:13px;color:#2d6a4f;font-weight:600;text-decoration:none;">Přejít do srovnávače →</a></div>`
  }

  const body = `
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1a1a1a;line-height:1.3;">Aktuální slevy na prémiové oleje</h1>
    <p style="color:#3d3d3d;font-size:15px;line-height:1.7;margin:0 0 20px;">Ceny u 18+ prodejců aktualizujeme každých 24 hodin. Toto jsou aktuální poklesy:</p>
    ${dealsHtml}
    <p style="color:#878779;font-size:13px;margin-top:16px;line-height:1.6;">To je poslední email ze série. Pokud vás téma baví, <a href="${SITE}" style="color:#2d6a4f;">navštivte olivator.cz</a> pro aktuální srovnání.</p>`

  return {
    subject: 'Aktuální slevy na prémiové olivové oleje',
    html: wrap(body, unsubUrl),
    text: `Aktuální slevy na prémiové oleje:\n${SITE}/srovnavac\n\nOdhlásit: ${unsubUrl}`,
  }
}

async function main() {
  const now = new Date().toISOString()

  const { data: pending, error } = await supabaseAdmin
    .from('email_drip_queue')
    .select(`
      id, scheduled_at, email_number, subscriber_id,
      subscriber:newsletter_signups(email, unsubscribe_token, confirmed, unsubscribed)
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at')
    .limit(50)

  if (error) { console.error('[drip] DB error:', error.message); process.exit(1) }
  if (!pending?.length) { console.log('[drip] Žádné naplánované emaily.'); return }

  console.log(`[drip] Zpracovávám ${pending.length} emailů`)
  let sent = 0, skipped = 0, failed = 0

  for (const row of pending as Array<{ id: string; email_number: number; subscriber: { email: string; unsubscribe_token: string | null; confirmed: boolean; unsubscribed: boolean } | null }>) {
    const sub = row.subscriber

    if (!sub?.email || !sub.confirmed || sub.unsubscribed) {
      await supabaseAdmin.from('email_drip_queue').update({ status: 'skipped', sent_at: new Date().toISOString() }).eq('id', row.id)
      skipped++
      continue
    }

    const unsubUrl = `${SITE}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token ?? ''}`
    try {
      const { subject, html, text } = await buildEmail(row.email_number, unsubUrl)
      await sendTransactionalEmail({ to: sub.email, subject, html, text })
      await supabaseAdmin.from('email_drip_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id)
      console.log(`  ✓ email_number=${row.email_number} → ${sub.email}`)
      sent++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`  ✗ email_number=${row.email_number} → ${sub.email}: ${msg}`)
      await supabaseAdmin.from('email_drip_queue').update({ status: 'failed', error: msg.slice(0, 500) }).eq('id', row.id)
      failed++
    }

    await delay(DELAY_MS)
  }

  console.log(`[drip] Hotovo — odesláno: ${sent}, přeskočeno: ${skipped}, chyba: ${failed}`)
}

main().catch(err => { console.error('[drip] CHYBA:', err.message); process.exit(1) })
