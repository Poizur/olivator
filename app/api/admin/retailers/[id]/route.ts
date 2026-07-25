import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { upsertRetailer, deleteRetailer } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    await upsertRetailer(body, id)
    // Retailer toggle ovlivňuje getSiteStats (počet aktivních) → invalidate cache
    revalidatePath('/', 'layout')
    revalidatePath('/srovnavac')
    // Log toggle pro audit trail
    if ('is_active' in body) {
      supabaseAdmin.from('agent_decisions').insert({
        agent_name: 'admin-ui',
        decision_type: body.is_active ? 'retailer_enabled' : 'retailer_disabled',
        payload: { retailer_id: id, is_active: body.is_active },
      }).then(({ error }) => { if (error) console.warn('[retailers] log failed:', error.message) })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/retailers PUT]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    await deleteRetailer(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/retailers DELETE]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
