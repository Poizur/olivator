// Historie tab — chronologická časová osa SEO aktivit + metric snapshots.
// Server component, čte z seo_activity_log a seo_metric_snapshots.

import { getActivityLog, getMetricHistory } from '@/lib/seo-activity'
import { TakeSnapshotButton } from './take-snapshot-button'

const ACTION_LABEL: Record<string, { label: string; icon: string; tone: string }> = {
  task_done:     { label: 'Úkol hotovo',  icon: '✓', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  task_pending:  { label: 'Úkol obnoven', icon: '↻', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  task_skipped:  { label: 'Úkol vyřazen', icon: '⊘', tone: 'text-text3 bg-off border-off2' },
  bulk_script:   { label: 'Bulk skript',  icon: '⚙', tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  migration:     { label: 'Migrace',      icon: '🗄', tone: 'text-purple-700 bg-purple-50 border-purple-200' },
  audit:         { label: 'Audit',        icon: '🔍', tone: 'text-text2 bg-white border-off2' },
  note:          { label: 'Poznámka',     icon: '📝', tone: 'text-text2 bg-off/50 border-off2' },
  insight:       { label: 'Insight',      icon: '💡', tone: 'text-amber-800 bg-amber-50 border-amber-200' },
  milestone:     { label: 'Milník',       icon: '🏁', tone: 'text-olive-dark bg-olive-bg border-olive-border' },
}

const METRIC_LABELS: Record<string, string> = {
  products_without_meta_title: 'Produkty bez meta_title',
  entity_photos_count: 'Entity fotky',
  active_brands: 'Aktivní brandy',
  cultivars_with_content: 'Cultivary s textem',
  articles_count: 'Článků',
  recipes_count: 'Receptů',
  rankings_in_db: 'Žebříčků v DB',
  seo_tasks_done: 'Hotových SEO úkolů',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'právě teď'
  if (diff < 3600) return `před ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `před ${Math.floor(diff / 3600)} h`
  if (diff < 7 * 86400) return `před ${Math.floor(diff / 86400)} dny`
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDayHeader(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export async function HistorieView() {
  const [log, snapshots] = await Promise.all([
    getActivityLog(200),
    getMetricHistory(),
  ])

  // Group log entries by day
  const byDay = new Map<string, typeof log>()
  for (const item of log) {
    const dayKey = item.ts.slice(0, 10) // YYYY-MM-DD
    if (!byDay.has(dayKey)) byDay.set(dayKey, [])
    byDay.get(dayKey)!.push(item)
  }
  const sortedDays = Array.from(byDay.keys()).sort().reverse()

  // Computer trends from snapshots
  const trends = Object.entries(snapshots).map(([key, series]) => {
    const first = series[0]
    const last = series[series.length - 1]
    const delta = last && first ? last.metric_value - first.metric_value : 0
    return { key, label: METRIC_LABELS[key] ?? key, first, last, delta, count: series.length }
  })

  return (
    <div>
      {/* Trendy panel — co se změnilo od baseline (první snapshot) */}
      <div className="bg-white border border-off2 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-0.5">
              Trendy
            </div>
            <div className="text-[14px] text-text">
              Změna metrik od baseline ({trends[0]?.first ? new Date(trends[0].first.taken_at).toLocaleDateString('cs-CZ') : '—'})
            </div>
          </div>
          <TakeSnapshotButton />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {trends.map((t) => {
            if (!t.first || !t.last) return null
            const positive = t.delta > 0
            const negative = t.delta < 0
            // Pro některé metriky je pokles dobrý (products_without_meta_title)
            const lowerIsBetter = t.key === 'products_without_meta_title'
            const isGood = lowerIsBetter ? negative : positive
            const isBad = lowerIsBetter ? positive : negative
            const tone = isGood ? 'text-emerald-700' : isBad ? 'text-red-700' : 'text-text3'
            const sign = positive ? '+' : ''
            return (
              <div key={t.key} className="border border-off2 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1">
                  {t.label}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[18px] font-[family-name:var(--font-display)] text-text">
                    {t.last.metric_value}
                    {t.last.metric_total != null && (
                      <span className="text-[12px] text-text3">/{t.last.metric_total}</span>
                    )}
                  </span>
                  {t.delta !== 0 && (
                    <span className={`text-[11px] font-semibold ${tone}`}>
                      {sign}{t.delta}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-text3 mt-0.5">
                  {t.count} snapshot{t.count === 1 ? '' : 'ů'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Activity log timeline */}
      <div className="mb-4">
        <div className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-3">
          Časová osa ({log.length} {log.length === 1 ? 'záznam' : log.length < 5 ? 'záznamy' : 'záznamů'})
        </div>
      </div>

      {log.length === 0 ? (
        <div className="bg-white border border-off2 rounded-xl p-10 text-center">
          <div className="text-3xl mb-3">📜</div>
          <h2 className="text-[15px] font-medium text-text mb-1">Žádné záznamy zatím</h2>
          <p className="text-[12px] text-text3 max-w-[400px] mx-auto">
            Změny statusů úkolů a manuální poznámky se sem budou logovat automaticky.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => (
            <div key={day}>
              <div className="text-[12px] font-semibold text-text2 mb-2 capitalize">
                {formatDayHeader(day)}
                <span className="ml-2 text-[11px] text-text3 font-normal">
                  · {byDay.get(day)!.length} záznam{byDay.get(day)!.length === 1 ? '' : 'ů'}
                </span>
              </div>
              <div className="bg-white border border-off2 rounded-xl divide-y divide-off2 overflow-hidden">
                {byDay.get(day)!.map((item) => {
                  const config = ACTION_LABEL[item.action_type] ?? ACTION_LABEL.note
                  return (
                    <div key={item.id} className="px-4 py-3 hover:bg-off/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-[12px] ${config.tone}`}
                        >
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] text-text font-medium">{item.title}</span>
                            <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${config.tone}`}>
                              {config.label}
                            </span>
                            <span className="text-[11px] text-text3 ml-auto">
                              {formatTime(item.ts)}
                            </span>
                          </div>
                          {item.description && (
                            <div className="text-[12px] text-text2 mt-1 leading-relaxed">
                              {item.description}
                            </div>
                          )}
                          {(item.metric_before != null || item.metric_after != null) && (
                            <div className="text-[11px] text-text3 mt-1.5">
                              <span className="font-mono">
                                {item.metric_key ? `${METRIC_LABELS[item.metric_key] ?? item.metric_key}: ` : ''}
                                {item.metric_before ?? '?'} → {item.metric_after ?? '?'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
