import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeProductPage } from '@/lib/product-scraper'
import { applyRescrapePatch, updateProductFacts } from '@/lib/data'
import { extractFactsFromText } from '@/lib/fact-extractor'

export const maxDuration = 45

/** Re-scrape product from stored source_url. Fills only NULL fields (preserves manual edits).
 *  Also refreshes extracted_facts from fresh raw_description. */
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
      .select('source_url')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const url = overrideUrl?.trim() || (product.source_url as string | null)
    if (!url) {
      return NextResponse.json(
        { error: 'Produkt nemá uloženou zdrojovou URL. Pošli URL v těle požadavku.' },
        { status: 400 }
      )
    }

    const scraped = await scrapeProductPage(url)

    const { filled } = await applyRescrapePatch(id, {
      sourceUrl: url,
      rawDescription: scraped.rawDescription,
      ean: scraped.ean,
      acidity: scraped.acidity,
      polyphenols: scraped.polyphenols,
      peroxideValue: scraped.peroxideValue,
      volumeMl: scraped.volumeMl,
      packaging: scraped.packaging,
    })

    // Re-run fact extraction on fresh raw text
    let factsCount = 0
    if (scraped.rawDescription && scraped.rawDescription.length > 30) {
      try {
        const facts = await extractFactsFromText(scraped.rawDescription)
        await updateProductFacts(id, facts)
        factsCount = facts.length
      } catch (err) {
        console.warn('[rescrape] fact extraction failed:', err)
      }
    }

    return NextResponse.json({
      ok: true,
      filled,
      factsCount,
      galleryCount: scraped.galleryImages.length,
      primaryImage: scraped.imageUrl,
      galleryImages: scraped.galleryImages,
      rawDescriptionLength: scraped.rawDescription?.length ?? 0,
    })
  } catch (err) {
    console.error('[rescrape]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
