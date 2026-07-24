import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const status = body.status as string
    if (!['contacted', 'ignored', 'added'].includes(status)) {
      return NextResponse.json({ error: 'Neplatný status' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('discovery_proposals')
      .update({ status, reviewed_at: new Date().toISOString(), notes: body.notes ?? null })
      .eq('id', id)
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ ok: true })
      throw error
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/discovery-proposals/patch]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
