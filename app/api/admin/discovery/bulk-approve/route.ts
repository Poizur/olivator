import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { publishCandidate, resolveRetailerForCandidate } from '@/lib/discovery-agent'
import {
  createBulkJob,
  setJobRunning,
  updateJobProgress,
  completeJob,
  failJob,
} from '@/lib/bulk-jobs'
import { sendBulkJobCompletionEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import type { ScrapedProduct } from '@/lib/product-scraper'

// Returns immediately after creating job. Background processing continues
// indefinitely on Railway long-running container (no timeout).
export const maxDuration = 30

/** POST { ids: [...], action: 'approve' | 'reject' }
 *  Creates bulk_job, kicks off background processing, returns jobId.
 *  Frontend polls /api/admin/bulk-jobs/[id] for live progress. */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
    const action: string = body?.action ?? 'approve'

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Žádné kandidáti' }, { status: 400 })
    }

    // Reject is fast — just one UPDATE, no background needed
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
      return NextResponse.json({ ok: true, immediate: true, rejected: ids.length })
    }

    // Approve = long pipeline. Create job + fire-and-forget background.
    const jobId = await createBulkJob('discovery_bulk_approve', ids.length, { ids })

    // Kick off async processing — don't await
    void processBulkApprove(jobId, ids).catch(err => {
      console.error('[bulk-approve background]', err)
      void failJob(jobId, err instanceof Error ? err.message : 'Unknown error')
    })

    return NextResponse.json({ ok: true, jobId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

/** Background worker — sequentially processes each candidate, updates job.
 *  No HTTP timeout because it runs after response is returned. */
async function processBulkApprove(jobId: string, ids: string[]): Promise<void> {
  await setJobRunning(jobId)
  const startTime = Date.now()

  const errors: Array<{ id: string; reason: string }> = []
  let processed = 0
  let succeeded = 0
  let failed = 0

  for (const id of ids) {
    try {
      const { data: candidate } = await supabaseAdmin
        .from('discovery_candidates')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (!candidate) {
        failed++
        errors.push({ id, reason: 'Not found' })
        continue
      }

      const data = candidate.candidate_data as unknown as ScrapedProduct
      const itemName = data?.name ?? 'unknown'

      // Update job — show what we're working on
      await updateJobProgress(jobId, {
        processed,
        succeeded,
        failed,
        current_item: itemName,
        errors,
      })

      // Path 1: already published — just activate
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
        succeeded++
      } else {
        // Path 2: full pipeline
        if (!data?.name || !data.slug) {
          failed++
          errors.push({ id, reason: 'Missing name/slug in scraped data' })
        } else {
          const { slug: retailerSlug, domain: retailerDomain } =
            await resolveRetailerForCandidate(candidate.source_domain as string)

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
          succeeded++
        }
      }
    } catch (err) {
      failed++
      errors.push({
        id,
        reason: err instanceof Error ? err.message.slice(0, 200) : 'Unknown error',
      })
      // Mark candidate failed
      try {
        await supabaseAdmin
          .from('discovery_candidates')
          .update({
            status: 'failed',
            reasoning: `Bulk approve failed: ${err instanceof Error ? err.message.slice(0, 200) : 'unknown'}`,
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'admin_bulk',
          })
          .eq('id', id)
      } catch {
        // ignore
      }
    } finally {
      processed++
      // Update progress after each item
      await updateJobProgress(jobId, {
        processed,
        succeeded,
        failed,
        errors,
      })
    }
  }

  // Done — revalidate public pages + mark complete
  try {
    revalidatePath('/')
    revalidatePath('/srovnavac')
  } catch {
    // ignore
  }
  await completeJob(jobId)

  // Email summary (best-effort, doesn't block job completion)
  try {
    const durationSec = Math.round((Date.now() - startTime) / 1000)
    await sendBulkJobCompletionEmail({
      type: 'discovery_bulk_approve',
      total: ids.length,
      succeeded,
      failed,
      errors,
      durationSec,
    })
  } catch (err) {
    console.warn('[bulk-approve] email send failed:', err)
  }
}
