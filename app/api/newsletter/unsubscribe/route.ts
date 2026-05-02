// GET /api/newsletter/unsubscribe?token=xxx
// Token-based unsubscribe — žádné login, žádné CSRF (token = secret).
// Zobrazí potvrzovací HTML page s "Resubscribe" tlačítkem (klasický UX).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function renderHtml(opts: {
  title: string
  message: string
  variant: 'success' | 'error'
  showResubscribe?: boolean
  email?: string
}): string {
  const color = opts.variant === 'success' ? '#2d6a4f' : '#c4711a'
  const bg = opts.variant === 'success' ? '#d8f3dc' : '#fef3c7'
  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${opts.title}</title>
<style>
  body { margin: 0; font-family: -apple-system, system-ui, sans-serif; background: #f5f5f7; color: #1d1d1f; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { max-width: 460px; background: white; border-radius: 16px; padding: 40px 32px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .icon { width: 64px; height: 64px; border-radius: 50%; background: ${bg}; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 8px; color: ${color}; }
  p { font-size: 14px; color: #6e6e73; margin: 0 0 16px; line-height: 1.5; }
  a.btn { display: inline-block; background: #2d6a4f; color: white; text-decoration: none; padding: 10px 20px; border-radius: 24px; font-size: 13px; font-weight: 500; margin-top: 8px; }
  a.btn-ghost { background: transparent; color: #6e6e73; }
  a.btn-ghost:hover { color: #2d6a4f; }
  .small { font-size: 11px; color: #aeaeb2; margin-top: 24px; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${opts.variant === 'success' ? '✓' : '!'}</div>
    <h1>${opts.title}</h1>
    <p>${opts.message}</p>
    <a href="/" class="btn">Zpět na olivátor</a>
    ${opts.showResubscribe && opts.email ? `<br><a href="/?resubscribe=${encodeURIComponent(opts.email)}" class="btn btn-ghost">Změnili jste názor? Přihlásit zpět</a>` : ''}
    <div class="small">Odhlášení proběhne pro všechny typy emailů (souhrn, slevy, sklizeň, alerty).</div>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token || token.length < 16 || token.length > 128) {
    return new NextResponse(
      renderHtml({
        title: 'Neplatný odkaz',
        message: 'Odkaz pro odhlášení je poškozený nebo neplatný. Zkus prosím použít odkaz z posledního emailu.',
        variant: 'error',
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  try {
    // Najdi signup podle tokenu
    const { data: signup, error: findErr } = await supabaseAdmin
      .from('newsletter_signups')
      .select('id, email, unsubscribed')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (findErr || !signup) {
      return new NextResponse(
        renderHtml({
          title: 'Odkaz nenalezen',
          message: 'Tento odhlašovací odkaz neexistuje nebo už byl použit. Pokud stále dostáváš emaily, kontaktuj nás na info@olivator.cz.',
          variant: 'error',
        }),
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    if (signup.unsubscribed) {
      return new NextResponse(
        renderHtml({
          title: 'Už jsi odhlášený',
          message: `Email ${signup.email} už je odhlášený. Žádné další zprávy ti nepošleme.`,
          variant: 'success',
          showResubscribe: true,
          email: signup.email as string,
        }),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // Označ jako unsubscribed
    const { error: updateErr } = await supabaseAdmin
      .from('newsletter_signups')
      .update({
        unsubscribed: true,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', signup.id)

    if (updateErr) {
      return new NextResponse(
        renderHtml({
          title: 'Něco selhalo',
          message: 'Nepodařilo se odhlásit. Zkus to prosím znovu nebo nám napiš na info@olivator.cz.',
          variant: 'error',
        }),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // Sync s Resend Audiences (best-effort)
    const apiKey = process.env.RESEND_API_KEY
    const audienceId = process.env.NEWSLETTER_AUDIENCE_ID
    if (apiKey && audienceId) {
      try {
        await fetch(
          `https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(signup.email as string)}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ unsubscribed: true }),
          }
        )
      } catch {
        // ignore
      }
    }

    return new NextResponse(
      renderHtml({
        title: 'Odhlášeno',
        message: `Email ${signup.email} byl úspěšně odhlášený. Žádné další zprávy ti nepošleme.`,
        variant: 'success',
        showResubscribe: true,
        email: signup.email as string,
      }),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (err) {
    console.error('[unsubscribe]', err)
    return new NextResponse(
      renderHtml({
        title: 'Chyba serveru',
        message: 'Nepodařilo se odhlásit. Zkus to prosím za chvíli.',
        variant: 'error',
      }),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}
