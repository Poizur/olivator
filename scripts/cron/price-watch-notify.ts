#!/usr/bin/env tsx
// cron:price-watch — denně 6:30 UTC
// Notifikuje uživatele při poklesu ceny ≥5 % NEBO ≥20 Kč — vše podle ceny, kterou zákazník zaplatí (akční, je-li nižší).
// Výchozí cena se ověřuje proti price_history (lib/price-watch.ts), takže přechod na akční cenu nevyvolá falešné „klesla“.
// Anti-spam: max 1× za 7 dní na hlídání. Nanečisto: --dry-run (nic neodešle, nic nezapíše).
import { supabaseAdmin } from '@/lib/supabase'
import { getSetting } from '@/lib/settings'
import { evaluateWatch } from '@/lib/price-watch'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://olivator.cz'
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'Olivator <onboarding@resend.dev>'
const ANTI_SPAM_DAYS = 7
const DRY_RUN = process.argv.includes('--dry-run')

interface WatchRow {
  id: string
  email: string
  product_id: string
  price_at_signup: number | null
  last_notified_at: string | null
  last_notified_price: number | null
  created_at: string
  unsubscribe_token: string
  products: { id: string; name: string; slug: string; status: string } | null
}

async function sendEmail(
  email: string,
  watch: WatchRow,
  currentPrice: number,
  refPrice: number,
  retailerName: string,
  retailerSlug: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const product = watch.products!
  const drop = Math.round(refPrice - currentPrice)
  const dropPct = Math.round(((refPrice - currentPrice) / refPrice) * 100)
  const productUrl = `${SITE}/olej/${product.slug}`
  const buyUrl = `${SITE}/go/${retailerSlug}/${product.slug}`
  const unsubUrl = `${SITE}/api/price-watch/unsubscribe?token=${watch.unsubscribe_token}`

  const html = `<!DOCTYPE html><html lang="cs">
<head><meta charset="utf-8"></head>
<body style="font-family:Inter,sans-serif;background:#f5f5f7;margin:0;padding:40px 0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;padding:40px;max-width:600px">
<tr><td>
  <div style="font-size:22px;font-weight:700;color:#2d6a4f;margin-bottom:20px">olivátor.cz</div>
  <div style="font-size:13px;color:#40916c;font-weight:500;background:#d8f3dc;border-radius:8px;padding:8px 14px;display:inline-block;margin-bottom:20px">
    📉 Cena klesla o ${dropPct}&nbsp;% (${drop}&nbsp;Kč) od ${refPrice}&nbsp;Kč
  </div>
  <h1 style="font-size:18px;color:#1d1d1f;margin:0 0 16px">${product.name}</h1>
  <div style="margin-bottom:24px">
    <span style="font-size:14px;color:#aeaeb2;text-decoration:line-through">${refPrice}&nbsp;Kč</span>
    <span style="font-size:28px;font-weight:700;color:#1d1d1f;margin-left:10px">${currentPrice}&nbsp;Kč</span>
    <span style="font-size:13px;color:#6e6e73;margin-left:8px">u ${retailerName}</span>
  </div>
  <a href="${buyUrl}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:500;margin-bottom:16px">
    Koupit u ${retailerName} →
  </a>
  <br>
  <a href="${productUrl}" style="font-size:13px;color:#2d6a4f;text-decoration:none">
    Zobrazit produkt na Olivátor →
  </a>
  <hr style="border:none;border-top:1px solid #e8e8ed;margin:28px 0">
  <p style="font-size:11px;color:#aeaeb2;margin:0;line-height:1.6">
    Hlídáš cenu produktu <a href="${productUrl}" style="color:#aeaeb2">${product.name}</a> na Olivátor.cz.<br>
    <a href="${unsubUrl}" style="color:#aeaeb2">Zrušit hlídání tohoto produktu</a>
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`

  if (!apiKey) {
    console.log(`[dry-run/no-key] Would email ${email}: ${product.name} ${refPrice} → ${currentPrice} Kč`)
    return true
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
        to: [email],
        subject: `📉 ${product.name}: cena klesla o ${dropPct} % — nyní ${currentPrice} Kč`,
        html,
      }),
    })
    return res.ok
  } catch (err) {
    console.error(`[price-watch-notify] email send failed for ${email}:`, err)
    return false
  }
}

async function run() {
  const emailsPaused = process.env.EMAILS_PAUSED === 'true' || await getSetting<boolean>('emails_paused').catch(() => false)
  if (emailsPaused) {
    console.log('[price-watch-notify] emails_paused — přeskakuji (údržba)')
    process.exit(0)
  }

  console.log(`[price-watch-notify] Start${DRY_RUN ? ' (DRY RUN)' : ''} ${new Date().toISOString()}`)

  const antiSpamCutoff = new Date(Date.now() - ANTI_SPAM_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: watches, error: watchError } = await supabaseAdmin
    .from('price_watches')
    .select(`
      id, email, product_id, price_at_signup, last_notified_at, last_notified_price, created_at, unsubscribe_token,
      products(id, name, slug, status)
    `)
    .eq('active', true)
    .eq('confirmed', true)
    .or(`last_notified_at.is.null,last_notified_at.lt.${antiSpamCutoff}`)

  if (watchError) {
    console.error('[price-watch-notify] fetch watches failed:', watchError.message)
    process.exit(1)
  }

  const rows = (watches ?? []) as unknown as WatchRow[]
  console.log(`[price-watch-notify] ${rows.length} watches to check`)

  let notified = 0
  let skipped = 0
  let errors = 0

  for (const watch of rows) {
    if (!watch.products || watch.products.status !== 'active') {
      skipped++
      continue
    }

    const decision = await evaluateWatch(watch)
    if (DRY_RUN) {
      console.log(
        `[price-watch-notify] ${decision.notify ? 'POSLAL BY' : 'neposlal by'} hlídání ${watch.id}: ${watch.products.name} — ${decision.reason}` +
        (decision.storedRef != null ? ` (uložená výchozí ${decision.storedRef} Kč, podle historie ${decision.historyRef ?? '—'} Kč)` : '')
      )
    }
    if (!decision.notify || !decision.offer || decision.refPrice == null || decision.currentPrice == null) {
      skipped++
      continue
    }
    const offer = decision.offer
    const currentPrice = decision.currentPrice
    const refPrice = decision.refPrice

    if (!DRY_RUN) {
      console.log(`[price-watch-notify] notify ${watch.id}: ${watch.products.name} ${decision.reason}`)
    }

    if (DRY_RUN) {
      notified++
      continue
    }

    const ok = await sendEmail(
      watch.email,
      watch,
      currentPrice,
      refPrice,
      offer.retailerName,
      offer.retailerSlug
    )

    if (ok) {
      await supabaseAdmin
        .from('price_watches')
        .update({ last_notified_at: new Date().toISOString(), last_notified_price: currentPrice })
        .eq('id', watch.id)
      notified++
    } else {
      errors++
    }
  }

  console.log(`[price-watch-notify] Done — notified: ${notified}, skipped: ${skipped}, errors: ${errors}`)
}

run().catch(err => {
  console.error('[price-watch-notify] Fatal:', err)
  process.exit(1)
})
