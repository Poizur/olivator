import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { upsertOffer } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    await upsertOffer(body)
    // Return the new id
    const { data } = await supabaseAdmin
      .from('product_offers')
      .select('id')
      .eq('product_id', body.productId)
      .eq('retailer_id', body.retailerId)
      .maybeSingle()
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (err) {
    console.error('[admin/offers POST]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
