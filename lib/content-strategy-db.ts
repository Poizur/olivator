import { supabaseAdmin } from './supabase'

export interface StrategyGoal {
  id: string
  quarter: string
  goalType: string
  goalName: string
  targetValue: number
  currentValue: number
  unit: string
  status: string
  notes: string | null
}

export interface CalendarEntry {
  id: string
  scheduledWeek: string
  scheduledPriority: number
  topicType: string | null
  primaryKeyword: string | null
  suggestedTitle: string | null
  estimatedVolume: number | null
  competitionLevel: string | null
  status: string
  seasonalContext: string | null
  relatedArticleId: string | null
  completedAt: string | null
}

export interface KeywordRow {
  id: string
  keyword: string
  searchVolume: number | null
  intent: string | null
  clusterGroup: string | null
  priority: number
  status: string
  targetUrl: string | null
}

export function currentQuarterLabel(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const q = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4'
  // Mapujeme na fiskální rok sprintu (Q1=kvě-čer, Q2=čer-srp, Q3=zář-lis, Q4=pro-úno)
  return `${q}_${year}`
}

export async function getStrategyGoals(quarter?: string): Promise<StrategyGoal[]> {
  try {
    let q = supabaseAdmin
      .from('strategy_goals')
      .select('id, quarter, goal_type, goal_name, target_value, current_value, unit, status, notes')
      .order('quarter')
    if (quarter) q = q.eq('quarter', quarter)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return (data ?? []).map((r) => ({
      id: r.id as string,
      quarter: r.quarter as string,
      goalType: r.goal_type as string,
      goalName: r.goal_name as string,
      targetValue: r.target_value as number,
      currentValue: r.current_value as number,
      unit: r.unit as string,
      status: r.status as string,
      notes: r.notes as string | null,
    }))
  } catch { return [] }
}

export async function getCalendarEntries(opts: {
  from?: string
  limit?: number
  status?: string
} = {}): Promise<CalendarEntry[]> {
  try {
    let q = supabaseAdmin
      .from('content_calendar')
      .select('id, scheduled_week, scheduled_priority, topic_type, primary_keyword, suggested_title, estimated_volume, competition_level, status, seasonal_context, related_article_id, completed_at')
      .order('scheduled_week')
    if (opts.from) q = q.gte('scheduled_week', opts.from)
    if (opts.status) q = q.eq('status', opts.status)
    if (opts.limit) q = q.limit(opts.limit)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return (data ?? []).map((r) => ({
      id: r.id as string,
      scheduledWeek: r.scheduled_week as string,
      scheduledPriority: r.scheduled_priority as number,
      topicType: r.topic_type as string | null,
      primaryKeyword: r.primary_keyword as string | null,
      suggestedTitle: r.suggested_title as string | null,
      estimatedVolume: r.estimated_volume as number | null,
      competitionLevel: r.competition_level as string | null,
      status: r.status as string,
      seasonalContext: r.seasonal_context as string | null,
      relatedArticleId: r.related_article_id as string | null,
      completedAt: r.completed_at as string | null,
    }))
  } catch { return [] }
}

export async function getKeywords(opts: { limit?: number; status?: string } = {}): Promise<KeywordRow[]> {
  try {
    let q = supabaseAdmin
      .from('keyword_mapping')
      .select('id, keyword, search_volume, intent, cluster_group, priority, status, target_url')
      .order('search_volume', { ascending: false, nullsFirst: false })
    if (opts.status) q = q.eq('status', opts.status)
    if (opts.limit) q = q.limit(opts.limit)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return (data ?? []).map((r) => ({
      id: r.id as string,
      keyword: r.keyword as string,
      searchVolume: r.search_volume as number | null,
      intent: r.intent as string | null,
      clusterGroup: r.cluster_group as string | null,
      priority: r.priority as number,
      status: r.status as string,
      targetUrl: r.target_url as string | null,
    }))
  } catch { return [] }
}

export async function getKeywordStats(): Promise<{
  total: number; mapped: number; unmapped: number; highPriorityUnmapped: number
}> {
  try {
    const { data } = await supabaseAdmin
      .from('keyword_mapping')
      .select('status, priority')
    const rows = data ?? []
    const total = rows.length
    const mapped = rows.filter((r) => r.status === 'mapped').length
    const unmapped = rows.filter((r) => r.status === 'unmapped').length
    const highPriorityUnmapped = rows.filter((r) => r.status === 'unmapped' && (r.priority ?? 0) >= 4).length
    return { total, mapped, unmapped, highPriorityUnmapped }
  } catch { return { total: 0, mapped: 0, unmapped: 0, highPriorityUnmapped: 0 } }
}
