// Admin /learnings — read-only seznam learnings z Learning Agentu.
// Cron týdně Po 08:00 extrahuje poučení z git commitů + agent_decisions
// přes Claude Haiku, dedupuje, ukládá sem. Admin může editovat manuálně
// přímo v Supabase (zatím bez UI editoru — prioritní je viditelnost).

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface LearningRow {
  id: string
  category: string
  title: string
  description: string | null
  source: string | null
  impact: string | null
  commit_hash: string | null
  created_at: string
}

const IMPACT_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-50',     text: 'text-red-700',    label: 'kritické' },
  high:     { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'vysoké' },
  medium:   { bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'střední' },
  low:      { bg: 'bg-off',        text: 'text-text2',      label: 'nízké' },
}

const CATEGORY_LABEL: Record<string, string> = {
  deployment: 'Deploy',
  content_quality: 'Content',
  agent_behavior: 'Agent',
  bug_fix: 'Bug fix',
  pipeline: 'Pipeline',
  architecture_debt: 'Architektura',
  observability: 'Logging',
  scraper: 'Scraper',
  affiliate: 'Affiliate',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminLearningsPage() {
  const { data, error } = await supabaseAdmin
    .from('project_learnings')
    .select('id, category, title, description, source, impact, commit_hash, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[admin/learnings]', error.message)
  }

  const learnings = (data ?? []) as LearningRow[]
  const byCategory = new Map<string, number>()
  for (const l of learnings) {
    byCategory.set(l.category, (byCategory.get(l.category) ?? 0) + 1)
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">
          — Systém
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Learnings</h1>
        <p className="text-[13px] text-text2 mt-1 max-w-[640px]">
          Poučení z provozních incidentů extrahovaná z git commitů (fix/hotfix/revert)
          a agent rozhodnutí. Aktualizuje se každé pondělí ráno přes Claude Haiku.
          Slouží jako institucionální paměť projektu.
        </p>
      </div>

      {learnings.length === 0 ? (
        <div className="bg-white border border-off2 rounded-xl p-10 text-center">
          <div className="text-3xl mb-3">🧠</div>
          <h2 className="text-[16px] font-medium text-text mb-1">Zatím žádná poučení</h2>
          <p className="text-[13px] text-text3">
            Cron <code className="bg-off rounded px-1">cron:learning</code> běží
            každé pondělí 08:00 UTC. První běh přijde po nejbližším pondělí.
          </p>
        </div>
      ) : (
        <>
          {/* Souhrn kategorií */}
          <div className="flex gap-2 flex-wrap mb-5">
            {Array.from(byCategory.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <span
                  key={cat}
                  className="text-[12px] bg-white border border-off2 text-text2 rounded-full px-3 py-1"
                >
                  {CATEGORY_LABEL[cat] ?? cat} ({count})
                </span>
              ))}
          </div>

          <div className="space-y-3">
            {learnings.map((l) => {
              const impact = IMPACT_CONFIG[l.impact ?? 'medium'] ?? IMPACT_CONFIG.medium
              const catLabel = CATEGORY_LABEL[l.category] ?? l.category
              return (
                <article
                  key={l.id}
                  className="bg-white border border-off2 rounded-xl p-5 hover:border-olive3/40 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2 text-[11px]">
                    <span className={`${impact.bg} ${impact.text} rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wide`}>
                      {impact.label}
                    </span>
                    <span className="text-text3">·</span>
                    <span className="text-text3">{catLabel}</span>
                    <span className="text-text3">·</span>
                    <span className="text-text3">{formatDate(l.created_at)}</span>
                    {l.commit_hash && (
                      <>
                        <span className="text-text3">·</span>
                        <Link
                          href={`https://github.com/Poizur/olivator/commit/${l.commit_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-olive font-mono"
                        >
                          {l.commit_hash.slice(0, 7)}
                        </Link>
                      </>
                    )}
                  </div>
                  <h2 className="text-[15px] font-medium text-text leading-tight mb-2">{l.title}</h2>
                  {l.description && (
                    <p className="text-[13px] text-text2 leading-relaxed whitespace-pre-line">
                      {l.description}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
