'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/seo-activity'

type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped'

const STATUS_TO_ACTION: Record<TaskStatus, 'task_done' | 'task_pending' | 'task_skipped'> = {
  done: 'task_done',
  pending: 'task_pending',
  in_progress: 'task_pending',  // logged jako pending — in_progress je tranzitní
  skipped: 'task_skipped',
}

export async function setTaskStatus(taskKey: string, status: TaskStatus) {
  // Načti current task pro log entry (title + previous status)
  const { data: prev } = await supabaseAdmin
    .from('seo_tasks')
    .select('title, status, phase')
    .eq('task_key', taskKey)
    .maybeSingle()

  const patch: Record<string, string | null> = { status }
  patch.completed_at = status === 'done' ? new Date().toISOString() : null

  const { error } = await supabaseAdmin
    .from('seo_tasks')
    .update(patch)
    .eq('task_key', taskKey)

  if (error) {
    return { ok: false, error: error.message }
  }

  // Log change (jen pokud se status reálně změnil)
  if (prev && (prev as { status: string }).status !== status) {
    await logActivity({
      action_type: STATUS_TO_ACTION[status],
      title: (prev as { title: string }).title,
      task_key: taskKey,
      description: `Fáze ${(prev as { phase: number }).phase}: ${(prev as { status: string }).status} → ${status}`,
      metadata: { phase: (prev as { phase: number }).phase, prev_status: (prev as { status: string }).status },
      source: 'admin_ui',
    })
  }

  revalidatePath('/admin/seo')
  return { ok: true }
}

export async function setTaskNotes(taskKey: string, notes: string) {
  const { error } = await supabaseAdmin
    .from('seo_tasks')
    .update({ notes })
    .eq('task_key', taskKey)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/seo')
  return { ok: true }
}

// ── Notes (Insights tab) ─────────────────────────────────────────────────────

export async function addNote(input: {
  category: 'strategy' | 'obstacle' | 'win' | 'question' | 'idea' | 'retro'
  title: string
  body?: string
  related_phase?: number | null
}) {
  if (!input.title.trim()) {
    return { ok: false, error: 'Title je povinný' }
  }

  const { data, error } = await supabaseAdmin
    .from('seo_notes')
    .insert({
      category: input.category,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      related_phase: input.related_phase ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  // Log do activity feedu — note je viditelný i v Historie
  await logActivity({
    action_type: input.category === 'win' ? 'milestone' : input.category === 'insight' as 'insight' ? 'insight' : 'note',
    title: input.title.trim(),
    description: input.body?.slice(0, 200) ?? null,
    metadata: { category: input.category, note_id: (data as { id: string })?.id, related_phase: input.related_phase },
    source: 'admin_ui',
  })

  revalidatePath('/admin/seo')
  return { ok: true, id: (data as { id: string }).id }
}

export async function setNoteStatus(noteId: string, status: 'open' | 'done' | 'archived') {
  const { error } = await supabaseAdmin
    .from('seo_notes')
    .update({ status })
    .eq('id', noteId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/seo')
  return { ok: true }
}

export async function deleteNote(noteId: string) {
  const { error } = await supabaseAdmin
    .from('seo_notes')
    .delete()
    .eq('id', noteId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/seo')
  return { ok: true }
}

// Manuální snapshot — volaný z UI tlačítka "Vzít snapshot teď"
export async function takeSnapshotNow() {
  const { takeMetricSnapshot } = await import('@/lib/seo-activity')
  const result = await takeMetricSnapshot()
  await logActivity({
    action_type: 'audit',
    title: 'Metric snapshot',
    description: `Manual snapshot — ${result.snapshots} metrik uloženo`,
    source: 'admin_ui',
  })
  revalidatePath('/admin/seo')
  return result
}
