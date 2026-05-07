// Activity log + metric snapshots pro SEO dashboard "Historie" tab.

import { supabaseAdmin } from './supabase'

export interface SeoActivity {
  id: string
  ts: string
  action_type:
    | 'task_done'
    | 'task_pending'
    | 'task_skipped'
    | 'bulk_script'
    | 'migration'
    | 'audit'
    | 'note'
    | 'insight'
    | 'milestone'
  task_key: string | null
  title: string
  description: string | null
  metric_key: string | null
  metric_before: number | null
  metric_after: number | null
  metadata: Record<string, unknown>
  source: string
}

export interface SeoMetricSnapshot {
  metric_key: string
  metric_value: number
  metric_total: number | null
  taken_at: string
}

export interface SeoNote {
  id: string
  created_at: string
  updated_at: string
  category: 'strategy' | 'obstacle' | 'win' | 'question' | 'idea' | 'retro'
  title: string
  body: string | null
  related_phase: number | null
  status: 'open' | 'done' | 'archived'
}

/** Vrátí poslední N entries z activity logu, nejnovější první. */
export async function getActivityLog(limit = 100): Promise<SeoActivity[]> {
  const { data, error } = await supabaseAdmin
    .from('seo_activity_log')
    .select('*')
    .order('ts', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[seo-activity] getActivityLog failed:', error.message)
    return []
  }
  return (data ?? []) as SeoActivity[]
}

/** Vrátí všechny snapshoty grouped per metric_key, sortováno chronologicky. */
export async function getMetricHistory(): Promise<Record<string, SeoMetricSnapshot[]>> {
  const { data, error } = await supabaseAdmin
    .from('seo_metric_snapshots')
    .select('metric_key, metric_value, metric_total, taken_at')
    .order('taken_at', { ascending: true })
  if (error) {
    console.error('[seo-activity] getMetricHistory failed:', error.message)
    return {}
  }
  const rows = (data ?? []) as SeoMetricSnapshot[]
  const grouped: Record<string, SeoMetricSnapshot[]> = {}
  for (const r of rows) {
    if (!grouped[r.metric_key]) grouped[r.metric_key] = []
    grouped[r.metric_key].push(r)
  }
  return grouped
}

/** Logs an SEO event into activity log. Tichá fail — log entries nejsou kritické. */
export async function logActivity(input: {
  action_type: SeoActivity['action_type']
  title: string
  task_key?: string | null
  description?: string | null
  metric_key?: string | null
  metric_before?: number | null
  metric_after?: number | null
  metadata?: Record<string, unknown>
  source?: string
}): Promise<void> {
  const { error } = await supabaseAdmin.from('seo_activity_log').insert({
    action_type: input.action_type,
    title: input.title,
    task_key: input.task_key ?? null,
    description: input.description ?? null,
    metric_key: input.metric_key ?? null,
    metric_before: input.metric_before ?? null,
    metric_after: input.metric_after ?? null,
    metadata: input.metadata ?? {},
    source: input.source ?? 'manual',
  })
  if (error) {
    console.warn('[seo-activity] log failed (non-blocking):', error.message)
  }
}

/** Active notes (open + recently done) pro Insights tab. */
export async function getNotes(): Promise<SeoNote[]> {
  const { data, error } = await supabaseAdmin
    .from('seo_notes')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[seo-activity] getNotes failed:', error.message)
    return []
  }
  return (data ?? []) as SeoNote[]
}

/** Snapshot current key metrics — volá se z cron / on-demand. */
export async function takeMetricSnapshot(): Promise<{ ok: boolean; snapshots: number }> {
  const queries: Array<{ key: string; total: boolean; query: () => Promise<{ count: number | null; total?: number | null }> }> = [
    {
      key: 'products_without_meta_title',
      total: true,
      query: async () => {
        const total = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active')
        const missing = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active').is('meta_title', null)
        return { count: missing.count, total: total.count }
      },
    },
    {
      key: 'entity_photos_count',
      total: false,
      query: async () => {
        const r = await supabaseAdmin.from('entity_images').select('*', { count: 'exact', head: true }).eq('status', 'active')
        return { count: r.count }
      },
    },
    {
      key: 'active_brands',
      total: true,
      query: async () => {
        const total = await supabaseAdmin.from('brands').select('*', { count: 'exact', head: true })
        const active = await supabaseAdmin.from('brands').select('*', { count: 'exact', head: true }).eq('status', 'active')
        return { count: active.count, total: total.count }
      },
    },
    {
      key: 'cultivars_with_content',
      total: true,
      query: async () => {
        const total = await supabaseAdmin.from('cultivars').select('*', { count: 'exact', head: true }).eq('status', 'active')
        const withContent = await supabaseAdmin.from('cultivars').select('*', { count: 'exact', head: true }).eq('status', 'active').not('description_long', 'is', null)
        return { count: withContent.count, total: total.count }
      },
    },
    {
      key: 'articles_count',
      total: false,
      query: async () => {
        const r = await supabaseAdmin.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'active')
        return { count: r.count }
      },
    },
    {
      key: 'recipes_count',
      total: false,
      query: async () => {
        const r = await supabaseAdmin.from('recipes').select('*', { count: 'exact', head: true }).eq('status', 'active')
        return { count: r.count }
      },
    },
    {
      key: 'rankings_in_db',
      total: false,
      query: async () => {
        const r = await supabaseAdmin.from('rankings').select('*', { count: 'exact', head: true }).eq('status', 'active')
        return { count: r.count }
      },
    },
    {
      key: 'seo_tasks_done',
      total: true,
      query: async () => {
        const total = await supabaseAdmin.from('seo_tasks').select('*', { count: 'exact', head: true }).neq('status', 'skipped')
        const done = await supabaseAdmin.from('seo_tasks').select('*', { count: 'exact', head: true }).eq('status', 'done')
        return { count: done.count, total: total.count }
      },
    },
  ]

  let saved = 0
  for (const q of queries) {
    const result = await q.query()
    const value = result.count ?? 0
    const total = q.total ? result.total ?? null : null
    const { error } = await supabaseAdmin.from('seo_metric_snapshots').insert({
      metric_key: q.key,
      metric_value: value,
      metric_total: total,
    })
    if (!error) saved++
  }
  return { ok: true, snapshots: saved }
}
