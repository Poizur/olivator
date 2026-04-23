import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createProduct } from '@/lib/data'

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: 'Název a slug jsou povinné' }, { status: 400 })
    }
    // EAN is optional — farm-direct products often don't have one
    const result = await createProduct({ ...body, status: body.status ?? 'draft' })
    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    console.error('[products POST]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
