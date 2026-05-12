import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { enqueueWelcomeSeries } from '@/lib/welcome-series'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const email = (body.email as string | undefined)?.trim()
  const source = (body.source as string | undefined) ?? 'test'

  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const unsubscribeToken = crypto.randomUUID()

  const { data: existing } = await supabaseAdmin
    .from('newsletter_signups')
    .select('id, confirmed')
    .eq('email', email)
    .maybeSingle()

  let subscriberId: string

  if (existing) {
    subscriberId = existing.id as string
    await supabaseAdmin
      .from('newsletter_signups')
      .update({ confirmed: true, unsubscribed: false, source })
      .eq('id', subscriberId)
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from('newsletter_signups')
      .insert({ email, source, confirmed: true, unsubscribed: false, unsubscribe_token: unsubscribeToken })
      .select('id')
      .single()

    if (error || !inserted) {
      return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
    }
    subscriberId = inserted.id as string
  }

  await enqueueWelcomeSeries(subscriberId).catch(() => null)

  return NextResponse.json({ ok: true, subscriberId, email, source })
}
