import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const all = req.nextUrl.searchParams.get('all') === '1'

  if (!token) {
    return new NextResponse('Neplatný odkaz.', { status: 400 })
  }

  const { data: watch } = await supabaseAdmin
    .from('price_watches')
    .select('id, email, products(name)')
    .eq('unsubscribe_token', token)
    .maybeSingle()

  if (!watch) {
    return new NextResponse('Odkaz je neplatný nebo hlídání neexistuje.', { status: 404 })
  }

  const productName = (watch.products as unknown as { name: string } | null)?.name ?? 'produkt'

  if (all) {
    await supabaseAdmin
      .from('price_watches')
      .update({ active: false })
      .eq('email', watch.email)
    return new NextResponse(renderAllHtml(watch.email), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  await supabaseAdmin
    .from('price_watches')
    .update({ active: false })
    .eq('id', watch.id)

  return new NextResponse(renderOneHtml(productName, token), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function renderOneHtml(productName: string, token: string) {
  return `<!DOCTYPE html><html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hlídání zrušeno — Olivátor</title>
</head>
<body style="font-family:Inter,sans-serif;background:#f5f5f7;margin:0;padding:60px 20px;text-align:center">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px">
  <div style="font-size:22px;font-weight:700;color:#2d6a4f;margin-bottom:20px">olivátor.cz</div>
  <div style="font-size:36px;margin-bottom:16px">✓</div>
  <h1 style="font-size:18px;color:#1d1d1f;margin:0 0 12px">Hlídání zrušeno</h1>
  <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 24px">
    Hlídání ceny pro <strong>${productName}</strong> bylo zrušeno.<br>
    Nebudeme ti posílat cenová upozornění pro tento produkt.
  </p>
  <a href="/api/price-watch/unsubscribe?token=${token}&all=1"
     style="font-size:12px;color:#aeaeb2;text-decoration:underline;display:block;margin-bottom:20px">
    Zrušit všechna hlídání cen
  </a>
  <a href="/" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:500">
    Zpět na Olivátor →
  </a>
</div>
</body></html>`
}

function renderAllHtml(email: string) {
  return `<!DOCTYPE html><html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vše odhlášeno — Olivátor</title>
</head>
<body style="font-family:Inter,sans-serif;background:#f5f5f7;margin:0;padding:60px 20px;text-align:center">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px">
  <div style="font-size:22px;font-weight:700;color:#2d6a4f;margin-bottom:20px">olivátor.cz</div>
  <div style="font-size:36px;margin-bottom:16px">✓</div>
  <h1 style="font-size:18px;color:#1d1d1f;margin:0 0 12px">Všechna hlídání zrušena</h1>
  <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 24px">
    Zrušili jsme všechna hlídání cen pro <strong>${email}</strong>.<br>
    Žádná cenová upozornění ti přijímat nebudou.
  </p>
  <a href="/" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:500">
    Zpět na Olivátor →
  </a>
</div>
</body></html>`
}
