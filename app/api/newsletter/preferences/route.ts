import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const KEYS = ['weekly', 'deals', 'harvest', 'alerts'] as const

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; preferences?: Record<string, unknown> } | null
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!/^[a-f0-9]{32,128}$/i.test(token)) {
    return NextResponse.json({ error: 'Neplatný odkaz.' }, { status: 400 })
  }

  const preferences = Object.fromEntries(KEYS.map((k) => [k, body?.preferences?.[k] === true])) as Record<(typeof KEYS)[number], boolean>
  if (!Object.values(preferences).some(Boolean)) {
    return NextResponse.json({ error: 'Vyberte aspoň jeden typ e-mailu, nebo se odhlaste úplně.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('newsletter_signups')
    .update({ preferences })
    .eq('unsubscribe_token', token)
    .eq('unsubscribed', false)
    .select('id')
  if (error) return NextResponse.json({ error: 'Uložení se nepovedlo, zkuste to prosím znovu.' }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Odběr s tímto odkazem nenalezen nebo je odhlášený.' }, { status: 404 })

  return NextResponse.json({ ok: true, preferences })
}
