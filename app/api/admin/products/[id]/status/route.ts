import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidateProduct } from '@/lib/revalidate'

/** Quick status change without going through full form save. */
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
    if (!['active', 'draft', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Neplatný status' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update({ status, updated_at: new Date().toISOString() })
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
