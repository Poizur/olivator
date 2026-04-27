// Bulk job tracking — for long-running operations that exceed HTTP timeout.
// Pattern:
//   1. Endpoint creates job (status='pending'), returns jobId immediately
//   2. Background runs the work, updating job (processed, succeeded, failed)
//   3. Frontend polls /api/admin/bulk-jobs/[id] every 2s for progress
//   4. Job marked 'completed' or 'failed' when done

import { supabaseAdmin } from './supabase'

export interface BulkJob {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  total: number
  processed: number
  succeeded: number
  failed: number
  current_item: string | null
  errors: Array<{ id: string; reason: string }>
  metadata: Record<string, unknown>
  started_at: string
  completed_at: string | null
}

export async function createBulkJob(
  type: string,
  total: number,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('bulk_jobs')
    .insert({
      type,
      status: 'pending',
      total,
      metadata,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create job')
  return data.id as string
}

export async function setJobRunning(jobId: string, currentItem: string | null = null): Promise<void> {
  await supabaseAdmin
    .from('bulk_jobs')
    .update({ status: 'running', current_item: currentItem })
    .eq('id', jobId)
}

export async function updateJobProgress(
  jobId: string,
  patch: {
    processed?: number
    succeeded?: number
    failed?: number
    current_item?: string | null
    errors?: Array<{ id: string; reason: string }>
  }
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (patch.processed !== undefined) update.processed = patch.processed
  if (patch.succeeded !== undefined) update.succeeded = patch.succeeded
  if (patch.failed !== undefined) update.failed = patch.failed
  if (patch.current_item !== undefined) update.current_item = patch.current_item
  if (patch.errors !== undefined) update.errors = patch.errors
  await supabaseAdmin.from('bulk_jobs').update(update).eq('id', jobId)
}

export async function completeJob(jobId: string): Promise<void> {
  await supabaseAdmin
    .from('bulk_jobs')
    .update({
      status: 'completed',
      current_item: null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

export async function failJob(jobId: string, reason: string): Promise<void> {
  await supabaseAdmin
    .from('bulk_jobs')
    .update({
      status: 'failed',
      current_item: null,
      completed_at: new Date().toISOString(),
      errors: [{ id: 'job', reason }],
    })
    .eq('id', jobId)
}

export async function getJob(jobId: string): Promise<BulkJob | null> {
  const { data } = await supabaseAdmin
    .from('bulk_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()
  if (!data) return null
  return {
    ...data,
    errors: Array.isArray(data.errors) ? data.errors : [],
    metadata: typeof data.metadata === 'object' ? data.metadata : {},
  } as BulkJob
}
