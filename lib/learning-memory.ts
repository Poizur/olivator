// Learning Memory Layer — sdílená paměť pro všechny AI agenty.
//
// Tabulky (migration 20260714_learning_memory.sql):
//   learnings            — strukturované lekce (L-001..L-015+)
//   learning_applications — kdy / jak je agent použil
//   patterns_observed    — opakující se vzorce → kandidáti na nové lekce
//
// Použití v agentu:
//   const learnings = await getRelevantLearnings({ keywords: ['newsletter','lru'] })
//   // injektuj do promptu
//   await recordApplication({ learningId: l.id, agentName: 'newsletter-reviewer', ... })

import { supabaseAdmin } from './supabase'

export type LearningCategory = 'bug_fix' | 'automation' | 'editorial' | 'seo' | 'affiliate' | 'architecture'

export interface Learning {
  id: string
  code: string
  title: string
  category: LearningCategory
  context: string | null
  observation: string
  rule: string
  keywords: string[]
  impact: 'high' | 'medium' | 'low'
  related_commit: string | null
  related_tickets: string[]
  times_applied: number
  last_applied_at: string | null
  validated: boolean
  created_at: string
  created_by: string
}

export interface PatternObserved {
  id: string
  signature: string
  description: string
  occurrences: number
  first_seen: string
  last_seen: string
  example_contexts: object | null
  status: 'open' | 'converted' | 'ignored'
  converted_to_learning: string | null
}

// ── 1. Načti relevantní lekce pro prompt injekci ──────────────────────────

export async function getRelevantLearnings(opts: {
  keywords: string[]
  category?: LearningCategory
  limit?: number
}): Promise<Learning[]> {
  const { keywords, category, limit = 5 } = opts

  // GIN index na keywords[] — hledáme průnik s dotazem
  // Supabase neimplementuje array overlap přes JS SDK jednoduše,
  // takže použijeme `.contains()` pro každý keyword a mergujeme výsledky.
  // Alternativně: RPC by bylo čistší, ale přidává komplexitu. Tohle stačí.
  const seen = new Set<string>()
  const results: Learning[] = []

  for (const kw of keywords) {
    if (results.length >= limit * 2) break
    const q = supabaseAdmin
      .from('learnings')
      .select('*')
      .contains('keywords', [kw])
      .order('impact', { ascending: false })
      .order('times_applied', { ascending: false })
      .limit(limit)

    if (category) q.eq('category', category)

    const { data } = await q
    for (const row of data ?? []) {
      if (!seen.has(row.id as string)) {
        seen.add(row.id as string)
        results.push(row as Learning)
      }
    }
  }

  return results.slice(0, limit)
}

// ── 2. Zaloguj použití lekce ────────────────────────────────────────────

export async function recordApplication(opts: {
  learningId: string
  agentName: string
  context: string
  decisionMade: string
}): Promise<void> {
  const { learningId, agentName, context, decisionMade } = opts

  // Insert log + fetch current counter (race OK — audit trail je primární)
  const [, countRow] = await Promise.all([
    supabaseAdmin.from('learning_applications').insert({
      learning_id: learningId,
      agent_name: agentName,
      context,
      decision_made: decisionMade,
    }),
    supabaseAdmin.from('learnings').select('times_applied').eq('id', learningId).single(),
  ])

  if (!countRow.error && countRow.data) {
    try {
      await supabaseAdmin
        .from('learnings')
        .update({
          times_applied: (countRow.data.times_applied as number) + 1,
          last_applied_at: new Date().toISOString(),
        })
        .eq('id', learningId)
    } catch (_) { /* audit log je primární, counter drop je OK */ }
  }
}

// ── 3. Zaznamenej opakující se vzorec ─────────────────────────────────────

export async function observePattern(opts: {
  signature: string
  description: string
  exampleContext: object
}): Promise<{ occurrences: number; shouldCreateLearning: boolean }> {
  const { signature, description, exampleContext } = opts

  // Upsert — pokud pattern existuje, přidáme výskyt
  const { data: existing } = await supabaseAdmin
    .from('patterns_observed')
    .select('id, occurrences')
    .eq('signature', signature)
    .eq('status', 'open')
    .single()

  if (existing) {
    const newCount = (existing.occurrences as number) + 1
    await supabaseAdmin
      .from('patterns_observed')
      .update({
        occurrences: newCount,
        last_seen: new Date().toISOString(),
        example_contexts: exampleContext,
      })
      .eq('id', existing.id)
    return { occurrences: newCount, shouldCreateLearning: newCount >= 3 }
  }

  await supabaseAdmin.from('patterns_observed').insert({
    signature,
    description,
    occurrences: 1,
    example_contexts: exampleContext,
    status: 'open',
  })
  return { occurrences: 1, shouldCreateLearning: false }
}

// ── 4. Vytvoř novou lekci (z agenta, čeká na admin validaci) ────────────

export async function createLearning(
  data: Omit<Learning, 'id' | 'times_applied' | 'validated' | 'created_at'>
): Promise<string> {
  const { data: inserted, error } = await supabaseAdmin
    .from('learnings')
    .insert({ ...data, validated: false, times_applied: 0, created_by: data.created_by ?? 'agent' })
    .select('id')
    .single()

  if (error) throw error
  return inserted.id as string
}

// ── 5. Stats pro admin dashboard ─────────────────────────────────────────

export async function getLearningStats(): Promise<{
  total: number
  byCategory: Partial<Record<LearningCategory, number>>
  topApplied: Array<{ code: string; title: string; times_applied: number }>
  recentPatterns: PatternObserved[]
}> {
  const [allRows, patternRows] = await Promise.all([
    supabaseAdmin.from('learnings').select('code, title, category, times_applied').order('times_applied', { ascending: false }),
    supabaseAdmin
      .from('patterns_observed')
      .select('*')
      .eq('status', 'open')
      .order('occurrences', { ascending: false })
      .limit(5),
  ])

  const rows = allRows.data ?? []
  const byCategory: Partial<Record<LearningCategory, number>> = {}
  for (const r of rows) {
    const cat = r.category as LearningCategory
    byCategory[cat] = (byCategory[cat] ?? 0) + 1
  }

  return {
    total: rows.length,
    byCategory,
    topApplied: rows.slice(0, 5).map(r => ({
      code: r.code as string,
      title: r.title as string,
      times_applied: r.times_applied as number,
    })),
    recentPatterns: (patternRows.data ?? []) as PatternObserved[],
  }
}

// ── Helper: formátuj lekce pro Claude prompt injekci ─────────────────────

export function formatLearningsForPrompt(learnings: Learning[]): string {
  if (learnings.length === 0) return ''
  const lines = learnings.map(l =>
    `[${l.code}] ${l.title} (${l.impact})\nPravidlo: ${l.rule}`
  )
  return `\nRELEVANTNÍ LEKCE Z MINULOSTI (aplikuj je v rozhodování):\n${lines.join('\n\n')}\n`
}
