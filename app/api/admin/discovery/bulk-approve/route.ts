import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { publishCandidate } from '@/lib/discovery-agent'
import { revalidatePath } from 'next/cache'
import type { ScrapedProduct } from '@/lib/product-scraper'

// 4 minutes — bulk of 5-10 candidates × 30-60s each pipeline
export const maxDuration = 600
export const dynamic = 'force-dynamic'

interface BulkResult {
  approved: number
  alreadyPublished: number
  failed: number
  errors: Array<{ candidateId: string; reason: string }>
}

/** POST { ids: [...], action: 'approve' | 'reject' }
 *  Bulk approve: for each candidate, runs publishCandidate or activates existing.
 *  Bulk reject: just flips status='rejected'. */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
    const action: string = body?.action ?? 'approve'

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Žádné kandidáti k zpracování' }, { status: 400 })
    }

    const result: BulkResult = { approved: 0, alreadyPublished: 0, failed: 0, errors: [] }

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('discovery_candidates')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin_bulk',
        })
        .in('id', ids)
      if (error) throw error
      return NextResponse.json({ ok: true, rejected: ids.length })
    }

    // Approve: process each sequentially (avoid Anthropic rate limits)
    for (const id of ids) {
      try {
        const { data: candidate } = await supabaseAdmin
          .from('discovery_candidates')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (!candidate) {
          result.failed++
          result.errors.push({ candidateId: id, reason: 'Not found' })
          continue
        }

        // Path 1: product already exists from prior auto-publish → just activate
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
              reviewed_by: 'admin_bulk',
            })
            .eq('id', id)
          result.alreadyPublished++
          continue
        }

        // Path 2: needs full pipeline
        const data = candidate.candidate_data as unknown as ScrapedProduct
        if (!data?.name || !data.slug) {
          result.failed++
          result.errors.push({ candidateId: id, reason: 'Missing name/slug in scraped data' })
          continue
        }

        const { data: retailer } = await supabaseAdmin
          .from('retailers')
          .select('slug')
          .eq('domain', candidate.source_domain as string)
          .maybeSingle()
        const retailerSlug = (retailer?.slug as string) || (candidate.source_domain as string).split('.')[0]
        const retailerDomain = candidate.source_domain as string

        const productId = await publishCandidate(data, retailerSlug, retailerDomain)
        await supabaseAdmin
          .from('discovery_candidates')
          .update({
            status: 'approved',
            resulting_product_id: productId,
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'admin_bulk',
          })
          .eq('id', id)
        result.approved++
      } catch (err) {
        result.failed++
        result.errors.push({
          candidateId: id,
          reason: err instanceof Error ? err.message : 'Unknown error',
        })
        // Mark as failed in DB for visibility
        await supabaseAdmin
          .from('discovery_candidates')
          .update({
            status: 'failed',
            reasoning: `Bulk approve failed: ${err instanceof Error ? err.message : 'unknown'}`,
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'admin_bulk',
          })
          .eq('id', id)
      }
    }

    revalidatePath('/')
    revalidatePath('/srovnavac')

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
