import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import {
  ensureProductsBucket,
  fetchAndStoreProductImage,
  fetchOpenFoodFactsImage,
  storeManualImage,
  clearProductImage,
} from '@/lib/product-image'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 30

/** GET — peek at the OFF image URL without committing. For admin preview. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('ean')
      .eq('id', id)
      .maybeSingle()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const url = await fetchOpenFoodFactsImage(product.ean as string)
    if (!url) {
      return NextResponse.json({ ok: false, reason: 'Open Food Facts nemá fotku pro tento EAN' })
    }
    return NextResponse.json({ ok: true, previewUrl: url, source: 'open_food_facts' })
  } catch (err) {
    console.error('[fetch-image GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await ensureProductsBucket()
    const { id } = await params

    // Optional manualUrl body
    let manualUrl: string | undefined
    try {
      const body = await request.json()
      if (body && typeof body.manualUrl === 'string' && body.manualUrl.trim()) {
        manualUrl = body.manualUrl.trim()
      }
    } catch {
      // no body = OFF auto-fetch
    }

    const result = manualUrl
      ? await storeManualImage(id, manualUrl)
      : await fetchAndStoreProductImage(id)

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const result = await clearProductImage(id)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[fetch-image DELETE]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
