import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { researchRetailer } from '@/lib/retailer-research'

// Fetch homepage + 2 about stránky + Claude Haiku extract — typicky 5-15 s.
// 60 s strop je dostatečný i kdyby eshop měl pomalý CDN.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { data: retailer, error } = await supabaseAdmin
      .from('retailers')
      .select('id, name, domain')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!retailer) return NextResponse.json({ error: 'Retailer nenalezen' }, { status: 404 })
    if (!retailer.domain) {
      return NextResponse.json(
        { error: 'Retailer nemá vyplněnou doménu — vyplň ji nahoře a ulož formulář.' },
        { status: 400 }
      )
    }

    const result = await researchRetailer(retailer.domain as string)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[admin/retailers/auto-research]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
