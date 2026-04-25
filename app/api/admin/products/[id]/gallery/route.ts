import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { downloadGalleryImage, detectImageRole, ensureProductsBucket } from '@/lib/product-image'

export const maxDuration = 90 // up to 25 images × ~3s each

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

    // Get product slug for filename generation
    const { data: product, error: productErr } = await supabaseAdmin
      .from('products')
      .select('slug')
      .eq('id', id)
      .maybeSingle()
    if (productErr) throw productErr
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    const slug = product.slug as string

    // Read all current rows
    const { data: allRows, error: readErr } = await supabaseAdmin
      .from('product_images')
      .select('id, url, source, alt_text')
      .eq('product_id', id)
    if (readErr) throw readErr

    // Delete rows NOT in keep (and not manual uploads)
    const toDelete = (allRows ?? []).filter(r => !keep.includes(r.id as string) && r.source !== 'manual').map(r => r.id as string)
    if (toDelete.length > 0) {
      await supabaseAdmin.from('product_images').delete().in('id', toDelete)
    }

    // Ensure storage bucket exists (idempotent)
    await ensureProductsBucket()

    // Download keep-flagged images that haven't been moved to storage yet.
    // Strategy: a row needs download if its url is NOT pointing at our Supabase Storage
    // (storage URLs contain '/storage/v1/object/public/products/').
    const STORAGE_PREFIX = '/storage/v1/object/public/products/'
    const keepRows = (allRows ?? []).filter(r => keep.includes(r.id as string))
    const downloadResults: Array<{ rowId: string; ok: boolean; reason?: string; filename?: string }> = []

    for (let i = 0; i < keepRows.length; i++) {
      const row = keepRows[i]
      const isPrimary = row.id === primaryId
      const currentUrl = (row.url as string) ?? ''

      // Skip download if already in our storage
      if (currentUrl.includes(STORAGE_PREFIX)) {
        await supabaseAdmin
          .from('product_images')
          .update({
            source: 'scraper',
            is_primary: isPrimary,
            sort_order: i,
          })
          .eq('id', row.id)
        downloadResults.push({ rowId: row.id as string, ok: true })
        continue
      }

      // Download + convert + upload
      const role = detectImageRole(currentUrl, row.alt_text as string | null)
      // Primary image always gets sortOrder 0 + role 'detail' (or detected role) so its filename is `slug.webp` if detail
      const sortOrder = isPrimary ? 0 : i + 1
      const result = await downloadGalleryImage(currentUrl, slug, role, sortOrder)

      if (!result.ok) {
        // Keep original URL; mark row but log failure
        downloadResults.push({ rowId: row.id as string, ok: false, reason: result.reason })
        await supabaseAdmin
          .from('product_images')
          .update({ source: 'scraper', is_primary: isPrimary, sort_order: i })
          .eq('id', row.id)
        continue
      }

      // Update row with new storage URL
      await supabaseAdmin
        .from('product_images')
        .update({
          url: result.storageUrl,
          source: 'scraper',
          is_primary: isPrimary,
          sort_order: i,
        })
        .eq('id', row.id)
      downloadResults.push({ rowId: row.id as string, ok: true, filename: result.filename })
    }

    // Update products.image_url to primary's NEW storage URL
    if (primaryId && keep.includes(primaryId)) {
      const { data: primaryRow } = await supabaseAdmin
        .from('product_images')
        .select('url')
        .eq('id', primaryId)
        .maybeSingle()
      if (primaryRow?.url) {
        await supabaseAdmin
          .from('products')
          .update({
            image_url: primaryRow.url as string,
            image_source: 'scraper',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
      }
    }

    const downloaded = downloadResults.filter(r => r.ok && r.filename).length
    const failed = downloadResults.filter(r => !r.ok)

    return NextResponse.json({
      ok: true,
      kept: keep.length,
      deleted: toDelete.length,
      downloaded,
      failed: failed.length,
      failures: failed.length > 0 ? failed.map(f => f.reason).slice(0, 5) : undefined,
    })
  } catch (err) {
    console.error('[gallery PUT]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
