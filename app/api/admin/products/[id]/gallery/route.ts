import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 30

/** GET — list all product_images for this product (scraper candidates + approved). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('product_images')
      .select('id, url, alt_text, is_primary, sort_order, source')
      .eq('product_id', id)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return NextResponse.json({ ok: true, images: data ?? [] })
  } catch (err) {
    console.error('[gallery GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

/** PUT — update keep/delete decisions. Body: { keep: [imageId], primary: imageId }.
 *  Deletes non-kept candidate rows. Promotes 'scraper_candidate' → 'approved'. */
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
    const keep: string[] = Array.isArray(body.keep) ? body.keep : []
    const primaryId: string | null = typeof body.primary === 'string' ? body.primary : null

    // Delete all rows NOT in keep (and scraper-sourced — never delete manual uploads that admin set)
    const { data: allRows, error: readErr } = await supabaseAdmin
      .from('product_images')
      .select('id, url, source')
      .eq('product_id', id)
    if (readErr) throw readErr

    const toDelete = (allRows ?? []).filter(r => !keep.includes(r.id as string) && r.source !== 'manual').map(r => r.id as string)
    if (toDelete.length > 0) {
      await supabaseAdmin.from('product_images').delete().in('id', toDelete)
    }

    // Mark kept rows as approved (source='scraper')
    if (keep.length > 0) {
      await supabaseAdmin
        .from('product_images')
        .update({ source: 'scraper', is_primary: false })
        .in('id', keep)
    }

    // Set primary
    if (primaryId && keep.includes(primaryId)) {
      await supabaseAdmin
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', primaryId)

      // Also update products.image_url so the old single-image pipeline still works
      const { data: primaryRow } = await supabaseAdmin
        .from('product_images')
        .select('url')
        .eq('id', primaryId)
        .maybeSingle()
      if (primaryRow?.url) {
        await supabaseAdmin
          .from('products')
          .update({ image_url: primaryRow.url as string, image_source: 'scraper', updated_at: new Date().toISOString() })
          .eq('id', id)
      }
    }

    return NextResponse.json({ ok: true, kept: keep.length, deleted: toDelete.length })
  } catch (err) {
    console.error('[gallery PUT]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
