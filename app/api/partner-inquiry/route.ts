// POST /api/partner-inquiry — zpracování poptávky prodejce z /pro-prodejce
// Ukládá do partner_inquiries, posílá notifikaci + potvrzení tazateli.
// Human gate: žádná automatická aktivace retailera.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTransactionalEmail } from '@/lib/newsletter-sender'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const URL_RE = /^https?:\/\/.+\..+/
const NOTIFY_EMAIL = 'info@makyoutdoors.com'

// Jednoduchý in-memory rate limiter (per IP, max 3 req / 10 min)
const attempts = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.reset < now) {
    attempts.set(ip, { count: 1, reset: now + 10 * 60 * 1000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkuste to za 10 minut.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Neplatná data' }, { status: 400 }) }

  // Honeypot
  if (body.website_confirm) {
    return NextResponse.json({ ok: true }) // tiché zahození
  }

  const shopName = String(body.shop_name ?? '').trim()
  const webUrl   = String(body.web_url ?? '').trim()
  const email    = String(body.email ?? '').trim().toLowerCase()
  const feedUrl  = String(body.feed_url ?? '').trim() || null
  const message  = String(body.message ?? '').trim().slice(0, 2000) || null
  const consent  = Boolean(body.consent)

  if (!shopName || shopName.length < 2)     return NextResponse.json({ error: 'Vyplňte název e-shopu.' }, { status: 400 })
  if (!webUrl || !URL_RE.test(webUrl))      return NextResponse.json({ error: 'Zadejte platnou URL webu.' }, { status: 400 })
  if (!email  || !EMAIL_RE.test(email))     return NextResponse.json({ error: 'Zadejte platný e-mail.' }, { status: 400 })
  if (!consent)                             return NextResponse.json({ error: 'Souhlas s podmínkami je povinný.' }, { status: 400 })
  if (feedUrl && !URL_RE.test(feedUrl))     return NextResponse.json({ error: 'URL feedu není platná.' }, { status: 400 })

  const { error: dbErr } = await supabaseAdmin.from('partner_inquiries').insert({
    shop_name: shopName,
    web_url:   webUrl,
    email,
    feed_url:  feedUrl,
    message,
    consent:   true,
    status:    'new',
  })

  if (dbErr) {
    console.error('[partner-inquiry] DB insert failed:', dbErr.message)
    return NextResponse.json({ error: 'Chyba serveru. Zkuste to prosím znovu.' }, { status: 500 })
  }

  // Notifikace Olivátoru
  await sendTransactionalEmail({
    to: NOTIFY_EMAIL,
    subject: `Nová poptávka prodejce: ${shopName}`,
    html: `
      <h2>Nová poptávka prodejce — olivator.cz/pro-prodejce</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
        <tr><td><b>E-shop</b></td><td>${shopName}</td></tr>
        <tr><td><b>Web</b></td><td><a href="${webUrl}">${webUrl}</a></td></tr>
        <tr><td><b>Email</b></td><td>${email}</td></tr>
        <tr><td><b>Feed URL</b></td><td>${feedUrl ?? '—'}</td></tr>
        <tr><td><b>Zpráva</b></td><td>${message ?? '—'}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="https://olivator.cz/admin">Zobrazit v adminu →</a></p>
    `,
    text: `Nová poptávka: ${shopName} | ${webUrl} | ${email}${feedUrl ? `\nFeed: ${feedUrl}` : ''}${message ? `\n${message}` : ''}`,
  }).catch(e => console.warn('[partner-inquiry] notify email failed:', e))

  // Potvrzení tazateli
  await sendTransactionalEmail({
    to: email,
    subject: 'Přijali jsme vaši poptávku — olivátor.cz',
    html: `
      <p>Zdravíme,</p>
      <p>přijali jsme poptávku na zařazení <strong>${shopName}</strong> do katalogu olivátor.cz.</p>
      <p>Ozveme se do <strong>2 pracovních dnů</strong> na tento email.</p>
      <p>— Tým Olivátor<br><a href="https://olivator.cz">olivator.cz</a></p>
    `,
    text: `Zdravíme, přijali jsme poptávku na zařazení ${shopName}. Ozveme se do 2 pracovních dnů. — Tým Olivátor`,
  }).catch(e => console.warn('[partner-inquiry] confirm email failed:', e))

  return NextResponse.json({ ok: true })
}
