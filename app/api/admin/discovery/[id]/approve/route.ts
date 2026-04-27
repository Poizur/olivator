import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { publishCandidate, resolveRetailerForCandidate } from '@/lib/discovery-agent'
import { revalidatePath } from 'next/cache'
import type { ScrapedProduct } from '@/lib/product-scraper'

// Long timeout — approval triggers full pipeline (image, AI rewrite, etc.)
export const maxDuration = 240

/** Approve a discovery candidate.
 *  - If candidate has resulting_product_id (auto_published earlier) → just flip status to active
 *  - If needs_review (no product yet) → run full publishCandidate() pipeline now
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { data: candidate, error: readErr } = await supabaseAdmin
      .from('discovery_candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (readErr || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Path 1: product already exists from auto-publish → just activate
    if (candidate.resulting_product_id) {
      await supabaseAdmin
        .from('products')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', candidate.resulting_product_id as string)

      await supabaseAdmin
        .from('discovery_candidates')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin',
        })
        .eq('id', id)

      revalidatePath('/')
      revalidatePath('/srovnavac')
      return NextResponse.json({ ok: true, productId: candidate.resulting_product_id })
    }

    // Path 2: needs_review candidate → run full pipeline now
    const data = candidate.candidate_data as unknown as ScrapedProduct
    if (!data?.name || !data.slug) {
      return NextResponse.json(
        { error: 'Candidate scraped data missing name/slug — cannot publish' },
        { status: 400 }
      )
    }

    const { slug: retailerSlug, domain: retailerDomain } =
      await resolveRetailerForCandidate(candidate.source_domain as string)

    let productId: string
    try {
      productId = await publishCandidate(data, retailerSlug, retailerDomain)
    } catch (err) {
      // Mark candidate failed so admin sees it
      await supabaseAdmin
        .from('discovery_candidates')
        .update({
          status: 'failed',
          reasoning: `Approve pipeline failed: ${err instanceof Error ? err.message : 'unknown'}`,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin',
        })
        .eq('id', id)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Pipeline failed' },
        { status: 500 }
      )
    }

    await supabaseAdmin
      .from('discovery_candidates')
      .update({
        status: 'approved',
        resulting_product_id: productId,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin',
      })
      .eq('id', id)

    revalidatePath('/')
    revalidatePath('/srovnavac')
    return NextResponse.json({ ok: true, productId })
  } catch (err) {
    console.error('[discovery approve]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
