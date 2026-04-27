import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

/** PATCH — update source (status, name, crawler_type, …) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json() as Record<string, unknown>
    const allowed = ['name', 'crawler_type', 'category_url', 'status', 'reasoning']
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of allowed) {
      if (k in body) payload[k] = body[k]
    }
    if (Object.keys(payload).length === 1) {
      return NextResponse.json({ error: 'Žádné pole k aktualizaci' }, { status: 400 })
    }
    const { error } = await supabaseAdmin.from('discovery_sources').update(payload).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { error } = await supabaseAdmin.from('discovery_sources').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
