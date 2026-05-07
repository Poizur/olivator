'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'

type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped'

export async function setTaskStatus(taskKey: string, status: TaskStatus) {
  const patch: Record<string, string | null> = { status }
  patch.completed_at = status === 'done' ? new Date().toISOString() : null

  const { error } = await supabaseAdmin
    .from('seo_tasks')
    .update(patch)
    .eq('task_key', taskKey)

  if (error) {
    return { ok: false, error: error.message }
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
