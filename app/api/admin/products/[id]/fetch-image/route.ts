import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { ensureProductsBucket, fetchAndStoreProductImage } from '@/lib/product-image'

export const maxDuration = 30 // seconds — sharp conversion is slow cold

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await ensureProductsBucket()
    const { id } = await params
    const result = await fetchAndStoreProductImage(id)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.reason }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[fetch-image]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
