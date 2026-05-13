import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateImageAltText } from '@/lib/product-image'

export const maxDuration = 120

/** POST — generate AI alt text via Claude Haiku vision for all product_images
 *  of a given product that are missing alt text. Idempotent: skips rows
 *  that already have alt_text unless ?force=1. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const force = request.nextUrl.searchParams.get('force') === '1'

    const { data: product } = await supabaseAdmin
      .from('products')
      .select('name')
      .eq('id', id)
      .maybeSingle()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    const productName = product.name as string

    const query = supabaseAdmin
      .from('product_images')
      .select('id, url, alt_text')
      .eq('product_id', id)
      .order('sort_order', { ascending: true })

    const { data: images, error } = force
      ? await query
      : await query.or('alt_text.is.null,alt_text.eq.')

    if (error) throw error

    const results: Array<{ id: string; ok: boolean; altText?: string; reason?: string }> = []

    for (const img of images ?? []) {
      const url = img.url as string
      try {
        const altText = await generateImageAltText(url, productName)
        const { error: updErr } = await supabaseAdmin
          .from('product_images')
          .update({ alt_text: altText })
          .eq('id', img.id)
        if (updErr) {
          results.push({ id: img.id as string, ok: false, reason: updErr.message })
        } else {
          results.push({ id: img.id as string, ok: true, altText })
        }
      } catch (err) {
        results.push({ id: img.id as string, ok: false, reason: err instanceof Error ? err.message : 'vision error' })
      }
    }

    return NextResponse.json({
      ok: true,
      total: results.length,
      succeeded: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    })
  } catch (err) {
    console.error('[generate-alt-texts]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
