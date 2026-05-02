import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const insert = {
      body: String(body.body ?? '').slice(0, 1000),
      category: String(body.category ?? 'general').slice(0, 40),
      source_url: body.source_url ? String(body.source_url).slice(0, 500) : null,
      active: body.active ?? true,
    }
    if (!insert.body.trim()) {
      return NextResponse.json({ error: 'Tělo je povinné' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('newsletter_facts')
      .insert(insert)
      .select('id')
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
