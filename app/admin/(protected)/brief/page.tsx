import { supabaseAdmin } from '@/lib/supabase'
import type { BriefJson, BriefDecision } from '@/lib/executive-director'
import { DecisionButtons } from './decision-buttons'

export const dynamic = 'force-dynamic'

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-off text-text3',
}

const CATEGORY_ICON: Record<string, string> = {
  seo: '🔍',
  content: '📝',
  affiliate: '💰',
  product: '🫒',
  tech: '⚙️',
  newsletter: '📨',
  catalog: '📦',
  growth: '📈',
}

export default async function BriefPage() {
  const { data: brief } = await supabaseAdmin
    .from('weekly_briefs')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  const { data: pastBriefs } = await supabaseAdmin
    .from('weekly_briefs')
    .select('id, week_label, status, generated_at')
    .order('week_start', { ascending: false })
    .limit(8)

  if (!brief) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-text mb-4">AI Ředitel</h1>
        <div className="bg-off rounded-2xl p-8 text-center">
          <p className="text-text2 mb-2">Zatím žádný brief.</p>
          <p className="text-[13px] text-text3">Generuje se automaticky každou neděli 20:00 UTC.</p>
          <p className="text-[13px] text-text3 mt-1">Manuální test: <code className="bg-off2 px-2 py-0.5 rounded text-[12px]">npm run cron:executive-brief</code></p>
        </div>
      </div>
    )
  }

  const { data: decisions } = await supabaseAdmin
    .from('weekly_decisions')
    .select('*')
    .eq('brief_id', brief.id as string)
    .order('priority', { ascending: true })

  const briefJson = brief.brief_json as BriefJson | null
  const pendingCount = (decisions ?? []).filter((d) => !d.admin_choice).length
  const decisionMap = new Map((decisions ?? []).map((d) => [d.decision_key as string, d]))

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">AI Ředitel</h1>
          <p className="text-[13px] text-text3 mt-1">
            {brief.week_label as string} — {new Date(brief.generated_at as string).toLocaleString('cs-CZ')}
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-terra text-white text-[12px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
            {pendingCount} čeká
          </span>
        )}
      </div>

      {!briefJson && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-[13px] text-red-700">
          Generace selhala: {brief.generation_error as string ?? 'Neznámá chyba'}. Brief bude znovu vygenerován příští neděli.
        </div>
      )}

      {briefJson && (
        <>
          {/* TL;DR */}
          {briefJson.tldr && (
            <div className="bg-olive text-white rounded-2xl px-5 py-4 text-[14px] font-medium leading-snug">
              {briefJson.tldr}
            </div>
          )}

          {/* STAV */}
          <section>
            <h2 className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-3">Stav</h2>
            <div className="bg-olive4/40 border border-olive5 rounded-2xl p-5">
              <p className="text-[14px] text-text leading-relaxed mb-4">{briefJson.stav.summary}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {briefJson.stav.metrics.map((m) => (
                  <div key={m.label} className="bg-white/70 rounded-xl p-3">
                    <div className="text-[11px] text-text3 mb-1">{m.label}</div>
                    <div className="text-[20px] font-bold text-text tabular-nums">
                      {m.value}{m.unit ? <span className="text-[12px] font-normal text-text3 ml-1">{m.unit}</span> : null}
                    </div>
                    {m.note && <div className="text-[11px] text-text3 mt-1 leading-tight">{m.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* POSUN */}
          {briefJson.posun && (
            <section>
              <h2 className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-3">Posun od minulého týdne</h2>
              <div className="bg-off rounded-xl p-4 text-[13px] text-text2 leading-relaxed">{briefJson.posun}</div>
            </section>
          )}

          {/* NAŠEL + ČEKÁ side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {briefJson.nasel?.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-3">Nálezy / Anomálie</h2>
                <ul className="space-y-2">
                  {briefJson.nasel.map((item, i) => (
                    <li key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-900 leading-snug">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {briefJson.ceka?.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-3">Čeká na akci</h2>
                <ul className="space-y-2">
                  {briefJson.ceka.map((item, i) => (
                    <li key={i} className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[12px] text-blue-900 leading-snug">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ROZHODNUTÍ */}
          <section>
            <h2 className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-3">
              Rozhodnutí ({briefJson.rozhodnuti?.length ?? 0})
            </h2>
            <div className="space-y-4">
              {(briefJson.rozhodnuti ?? []).map((d: BriefDecision) => {
                const dbRow = decisionMap.get(d.key)
                const isDone = !!dbRow?.admin_choice
                return (
                  <div
                    key={d.key}
                    className={`bg-white border rounded-2xl p-5 transition-opacity ${isDone ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{CATEGORY_ICON[d.category] ?? '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-semibold text-text">{d.title}</h3>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLOR[d.priority] ?? 'bg-off text-text3'}`}>
                            {d.priority}
                          </span>
                          {isDone && (
                            <span className="ml-auto text-[11px] text-olive font-medium">✓ {dbRow!.admin_choice as string}</span>
                          )}
                        </div>
                        <p className="text-[13px] text-text2 leading-relaxed">{d.context}</p>
                      </div>
                    </div>

                    {/* ROI + čas + learning */}
                    <div className="flex flex-wrap gap-3 mb-4 text-[12px]">
                      {d.roi && (
                        <div className="bg-olive4/50 rounded-lg px-3 py-1.5 text-olive">
                          <span className="font-semibold">ROI:</span> {d.roi}
                        </div>
                      )}
                      {d.cas && (
                        <div className="bg-off rounded-lg px-3 py-1.5 text-text2">
                          <span className="font-semibold">Čas:</span> {d.cas}
                        </div>
                      )}
                      {d.learning_applied && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 text-purple-700">
                          📚 {d.learning_applied}
                        </div>
                      )}
                    </div>

                    {/* Doporučení */}
                    {d.recommended_option && (
                      <div className="text-[12px] text-olive mb-3">
                        AI doporučuje: <strong>{d.recommended_option}</strong>
                        {d.options.find((o) => o.label === d.recommended_option)?.impact && (
                          <span className="text-text3"> — {d.options.find((o) => o.label === d.recommended_option)!.impact}</span>
                        )}
                      </div>
                    )}

                    {dbRow ? (
                      <DecisionButtons
                        decisionId={dbRow.id as string}
                        options={d.options}
                        currentChoice={dbRow.admin_choice as string | null}
                        executorRule={(dbRow.executor_rule as string | null) ?? null}
                        executedAt={(dbRow.executed_at as string | null) ?? null}
                      />
                    ) : (
                      <div className="text-[12px] text-text3 italic">Brief nebyl uložen do DB (dry-run?)</div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* PROVEDENÉ AKCE — rozhodnutí kde executor proběhl */}
          {(decisions ?? []).some((d) => d.executed_at) && (
            <section>
              <h2 className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-3">Provedené akce</h2>
              <div className="space-y-2">
                {(decisions ?? [])
                  .filter((d) => d.executed_at)
                  .map((d) => (
                    <div key={d.id as string} className="flex items-center gap-3 bg-olive4/30 border border-olive5 rounded-xl px-4 py-2.5 text-[12px]">
                      <span className="text-olive">⚙️</span>
                      <span className="font-medium text-text flex-1">{d.title as string}</span>
                      <span className="text-text3 font-mono text-[11px]">{d.executor_rule as string}</span>
                      <span className="text-text3">{new Date(d.executed_at as string).toLocaleString('cs-CZ')}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* PAMĚŤ */}
          {(briefJson.pamet?.learnings_used?.length > 0 || briefJson.pamet?.patterns_noted?.length > 0) && (
            <section>
              <h2 className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-3">Paměť lekcí</h2>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
                {briefJson.pamet.learnings_used?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mb-1.5">Použité lekce</div>
                    <div className="flex flex-wrap gap-2">
                      {briefJson.pamet.learnings_used.map((code) => (
                        <span key={code} className="bg-purple-100 text-purple-800 text-[12px] font-medium px-2.5 py-1 rounded-lg">
                          📚 {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {briefJson.pamet.patterns_noted?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mb-1.5">Sledované patterny</div>
                    <ul className="space-y-1.5">
                      {briefJson.pamet.patterns_noted.map((p, i) => (
                        <li key={i} className="text-[12px] text-purple-900 leading-snug">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Historie */}
      {(pastBriefs ?? []).length > 1 && (
        <section>
          <h2 className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-3">Historie briefů</h2>
          <div className="space-y-1">
            {(pastBriefs ?? []).slice(1).map((b) => (
              <div key={b.id as string} className="flex items-center gap-3 text-[13px] text-text2 py-1.5 border-b border-off last:border-0">
                <span className="font-medium w-20">{b.week_label as string}</span>
                <span className="text-text3">{new Date(b.generated_at as string).toLocaleDateString('cs-CZ')}</span>
                <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${b.status === 'reviewed' ? 'bg-olive4 text-olive' : 'bg-off text-text3'}`}>
                  {b.status as string}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
