// Admin /learnings — Learning Memory Layer (Krok 0.5).
// Tabulka strukturovaných lekcí z learnings tabulky + otevřené patterny.
// Read-only; admin může promovat pattern na lekci (status → converted).

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import type { LearningCategory } from '@/lib/learning-memory'
import { PromotePatternButton } from './promote-pattern-button'

export const dynamic = 'force-dynamic'

interface LearningRow {
  id: string
  code: string
  title: string
  category: string
  impact: string
  times_applied: number
  last_applied_at: string | null
  observation: string
  rule: string
  related_commit: string | null
  keywords: string[]
  validated: boolean
}

interface PatternRow {
  id: string
  signature: string
  description: string
  occurrences: number
  first_seen: string
  last_seen: string
  status: string
}

const IMPACT_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'high' },
  medium: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'medium' },
  low:    { bg: 'bg-off',       text: 'text-text2',      label: 'low' },
}

const CATEGORY_LABEL: Record<LearningCategory, string> = {
  bug_fix:      'Bug fix',
  automation:   'Automation',
  editorial:    'Editorial',
  seo:          'SEO',
  affiliate:    'Affiliate',
  architecture: 'Architektura',
}

const ALL_CATEGORIES: LearningCategory[] = ['bug_fix', 'automation', 'editorial', 'seo', 'affiliate', 'architecture']

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminLearningsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const activeCategory = (params.category ?? '') as LearningCategory | ''

  const learningsQuery = supabaseAdmin
    .from('learnings')
    .select('id, code, title, category, impact, times_applied, last_applied_at, observation, rule, related_commit, keywords, validated')
    .order('code', { ascending: true })

  if (activeCategory) learningsQuery.eq('category', activeCategory)

  const [learningsResult, patternsResult] = await Promise.all([
    learningsQuery,
    supabaseAdmin
      .from('patterns_observed')
      .select('id, signature, description, occurrences, first_seen, last_seen, status')
      .eq('status', 'open')
      .gte('occurrences', 2)
      .order('occurrences', { ascending: false })
      .limit(10),
  ])

  const learnings = (learningsResult.data ?? []) as LearningRow[]
  const patterns = (patternsResult.data ?? []) as PatternRow[]

  const byCategory: Partial<Record<string, number>> = {}
  for (const l of learnings) {
    byCategory[l.category] = (byCategory[l.category] ?? 0) + 1
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Systém</div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Learning Memory</h1>
        <p className="text-[13px] text-text2 mt-1 max-w-[640px]">
          Strukturované lekce z reálných incidentů. Agenti je čtou přes{' '}
          <code className="bg-off rounded px-1">getRelevantLearnings()</code> před rozhodnutím
          a logují aplikaci do{' '}
          <code className="bg-off rounded px-1">learning_applications</code>.
        </p>
      </div>

      {/* Filtr kategorií */}
      <div className="flex gap-2 flex-wrap mb-5">
        <Link
          href="/admin/learnings"
          className={`text-[12px] rounded-full px-3 py-1 border transition-colors ${
            !activeCategory
              ? 'bg-olive text-white border-olive'
              : 'bg-white border-off2 text-text2 hover:border-olive3/40'
          }`}
        >
          Vše ({learnings.length || '?'})
        </Link>
        {ALL_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/admin/learnings?category=${cat}`}
            className={`text-[12px] rounded-full px-3 py-1 border transition-colors ${
              activeCategory === cat
                ? 'bg-olive text-white border-olive'
                : 'bg-white border-off2 text-text2 hover:border-olive3/40'
            }`}
          >
            {CATEGORY_LABEL[cat]}
          </Link>
        ))}
      </div>

      {/* Tabulka lekcí */}
      {learnings.length === 0 ? (
        <div className="bg-white border border-off2 rounded-xl p-10 text-center mb-8">
          <div className="text-3xl mb-3">🧠</div>
          <p className="text-[13px] text-text3">Žádné lekce v této kategorii.</p>
        </div>
      ) : (
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-off2">
                <th className="text-left py-2 pr-4 text-text3 font-medium w-[70px]">Kód</th>
                <th className="text-left py-2 pr-4 text-text3 font-medium">Název</th>
                <th className="text-left py-2 pr-4 text-text3 font-medium w-[100px]">Kategorie</th>
                <th className="text-left py-2 pr-4 text-text3 font-medium w-[70px]">Impact</th>
                <th className="text-right py-2 pr-4 text-text3 font-medium w-[70px]">Aplikací</th>
                <th className="text-left py-2 text-text3 font-medium w-[110px]">Naposledy</th>
              </tr>
            </thead>
            <tbody>
              {learnings.map((l) => {
                const imp = IMPACT_CONFIG[l.impact] ?? IMPACT_CONFIG.medium
                return (
                  <tr key={l.id} className="border-b border-off2/50 hover:bg-off/50 transition-colors group">
                    <td className="py-3 pr-4 font-mono text-text3 text-[12px]">{l.code}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-text leading-tight">{l.title}</div>
                      <div className="text-[12px] text-text3 mt-0.5 line-clamp-1">{l.rule}</div>
                      {l.related_commit && (
                        <Link
                          href={`https://github.com/Poizur/olivator/commit/${l.related_commit}`}
                          target="_blank"
                          className="text-[11px] font-mono text-olive hover:underline"
                        >
                          {l.related_commit.slice(0, 7)}
                        </Link>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-text2">{CATEGORY_LABEL[l.category as LearningCategory] ?? l.category}</td>
                    <td className="py-3 pr-4">
                      <span className={`${imp.bg} ${imp.text} text-[11px] rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide`}>
                        {imp.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-text2 font-mono">{l.times_applied}</td>
                    <td className="py-3 text-text3">{formatDate(l.last_applied_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Otevřené patterny */}
      {patterns.length > 0 && (
        <section>
          <h2 className="text-[16px] font-semibold text-text mb-1">
            Otevřené patterny{' '}
            <span className="text-[13px] font-normal text-text3">({patterns.length})</span>
          </h2>
          <p className="text-[12px] text-text3 mb-4">
            Opakující se vzorce (≥2 výskyty). Pokud se ustálí na 3+, je kandidátem na novou lekci.
          </p>
          <div className="space-y-3">
            {patterns.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-off2 rounded-xl p-4 flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-text3">{p.signature}</span>
                    <span className="text-[11px] bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
                      {p.occurrences}×
                    </span>
                  </div>
                  <div className="text-[13px] text-text leading-snug">{p.description}</div>
                  <div className="text-[11px] text-text3 mt-1">
                    První výskyt: {formatDate(p.first_seen)} · Naposledy: {formatDate(p.last_seen)}
                  </div>
                </div>
                <PromotePatternButton patternId={p.id} signature={p.signature} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
