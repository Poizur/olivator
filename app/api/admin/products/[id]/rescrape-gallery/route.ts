import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeProductPage } from '@/lib/product-scraper'

export const maxDuration = 30

/** Lightweight rescrape — only refreshes gallery candidate URLs.
 *  Skips text/AI/score pipeline. ~5-10s vs 30-45s of the full rescrape.
 *  Use when admin just wants more photo options for an existing product. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const overrideUrl: string | undefined = body?.url

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('source_url, image_url')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const url = overrideUrl?.trim() || (product.source_url as string | null)
    if (!url) {
      return NextResponse.json(
        { error: 'Produkt nemá uloženou zdrojovou URL.' },
        { status: 400 }
      )
    }

    const scraped = await scrapeProductPage(url)
    if (scraped.galleryImages.length === 0) {
      return NextResponse.json({
        ok: true,
        added: 0,
        message: 'Zdrojová stránka neobsahuje obrázky.',
      })
    }

    // Replace previous candidates, keep approved/manual rows.
    await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('product_id', id)
      .eq('source', 'scraper_candidate')

    const { data: existingRows } = await supabaseAdmin
      .from('product_images')
      .select('url')
      .eq('product_id', id)
    const existingUrls = new Set((existingRows ?? []).map((r) => r.url as string))

    const newCandidates = scraped.galleryImages.filter((img) => !existingUrls.has(img.url))
    if (newCandidates.length > 0) {
      const { error: imgErr } = await supabaseAdmin.from('product_images').insert(
        newCandidates.map((img, i) => ({
          product_id: id,
          url: img.url,
          alt_text: img.alt,
          is_primary: false,
          sort_order: 100 + i,
          source: 'scraper_candidate',
        }))
      )
      if (imgErr) throw imgErr
    }

    return NextResponse.json({
      ok: true,
      added: newCandidates.length,
      existing: existingUrls.size,
      total: scraped.galleryImages.length,
    })
  } catch (err) {
    console.error('[rescrape-gallery]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
