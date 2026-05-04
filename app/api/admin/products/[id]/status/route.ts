import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidateProduct } from '@/lib/revalidate'

/** Quick status change without going through full form save.
 *  Optional body: { reasonCode?: string, reasonNote?: string }. Pro inactive
 *  / excluded status admin v UI vybere preset (url_404, duplicate, …) nebo
 *  napíše free text. Při návratu na active / draft bez reasonu vyčistíme. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const status: string = body?.status
    if (!['active', 'draft', 'inactive', 'excluded'].includes(status)) {
      return NextResponse.json({ error: 'Neplatný status' }, { status: 400 })
    }

    const reasonCode: string | null = body?.reasonCode ?? null
    const reasonNote: string | null = body?.reasonNote ?? null

    // Pokud klient explicitně neposílá reason a status je 'active' / 'draft',
    // vyčistíme audit fields (změna zpět = zrušený důvod). Pro inactive /
    // excluded je důvod očekávaný, ale nevynucujeme (UI ho nabídne).
    const clearReason = !body?.reasonCode && !body?.reasonNote && (status === 'active' || status === 'draft')

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      status_changed_by: 'admin',
      status_changed_at: new Date().toISOString(),
    }
    if (clearReason) {
      updates.status_reason_code = null
      updates.status_reason_note = null
    } else {
      if (body?.reasonCode !== undefined) updates.status_reason_code = reasonCode
      if (body?.reasonNote !== undefined) updates.status_reason_note = reasonNote
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
    if (error) throw error

    await revalidateProduct(id)
    return NextResponse.json({ ok: true, status })
  } catch (err) {
    console.error('[status PATCH]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
