import Link from 'next/link'
import { getCalendarEntries } from '@/lib/content-strategy-db'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Editoriální kalendář | Admin' }

const STATUS_CONFIG: Record<string, { cls: string; dot: string; label: string }> = {
  planned:     { cls: 'bg-off text-text3',         dot: 'bg-text3',      label: 'Plán' },
  in_progress: { cls: 'bg-blue-50 text-blue-700',  dot: 'bg-blue-500',   label: 'Probíhá' },
  done:        { cls: 'bg-green-50 text-green-700', dot: 'bg-green-500',  label: 'Hotovo' },
  skipped:     { cls: 'bg-off text-text3',          dot: 'bg-off2',       label: 'Přeskočeno' },
  deferred:    { cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400',  label: 'Odloženo' },
}

const TYPE_EMOJI: Record<string, string> = {
  article: '📝', landing_page: '🗂️', brand_review: '⭐',
  pillar: '🏛️', refresh: '🔄', recipe: '🍅',
}

const SEASONAL_EMOJI: Record<string, string> = {
  summer: '☀️', harvest_start: '🌿', harvest: '🍂', new_harvest: '✨',
  pre_harvest: '🫒', christmas: '🎄', black_friday: '🏷️', year_end: '🎆',
}

const COMPETITION_CLS: Record<string, string> = {
  low: 'text-green-600', medium: 'text-amber-600', high: 'text-red-600',
}

function groupByMonth(entries: Awaited<ReturnType<typeof getCalendarEntries>>) {
  const map = new Map<string, typeof entries>()
  for (const e of entries) {
    const key = e.scheduledWeek.slice(0, 7) // YYYY-MM
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })
}

function formatWeek(date: string) {
  return new Date(date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
}

export default async function ContentCalendarPage() {
  const entries = await getCalendarEntries({ from: '2026-05-01' })
  const grouped = groupByMonth(entries)

  const done = entries.filter((e) => e.status === 'done').length
  const total = entries.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-text">Editoriální kalendář</h1>
          <p className="text-[13px] text-text2 mt-0.5">
            {done}/{total} dokončeno · {total - done} zbývá
          </p>
        </div>
        <Link href="/admin/content-strategy" className="text-[13px] text-text2 hover:text-text">
          ← Strategie
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-10 text-center text-[14px] text-text3">
          Žádné záznamy — spusť migration SQL pro seed kalendáře.
        </div>
      ) : (
        Array.from(grouped.entries()).map(([month, weeks]) => (
          <div key={month}>
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-3 px-1">
              {formatMonth(month)}
            </h2>
            <div className="space-y-2">
              {weeks.map((e) => {
                const sc = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.planned
                const isPast = new Date(e.scheduledWeek) < new Date()
                return (
                  <div
                    key={e.id}
                    className={`bg-white border border-off2 rounded-[var(--radius-card)] px-4 py-3 flex items-start gap-3 ${isPast && e.status === 'planned' ? 'opacity-60' : ''}`}
                  >
                    {/* Priority indicator */}
                    <div className="flex flex-col items-center gap-1 shrink-0 w-6 pt-0.5">
                      {Array.from({ length: e.scheduledPriority }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-olive/40" />
                      ))}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-text3 font-mono">
                          {formatWeek(e.scheduledWeek)}
                        </span>
                        {e.topicType && (
                          <span className="text-[10px] text-text2">
                            {TYPE_EMOJI[e.topicType] ?? '📄'} {e.topicType}
                          </span>
                        )}
                        {e.seasonalContext && (
                          <span className="text-[10px]">
                            {SEASONAL_EMOJI[e.seasonalContext] ?? '📅'} {e.seasonalContext}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] font-medium text-text mt-0.5 leading-tight">
                        {e.suggestedTitle ?? '—'}
                      </div>
                      {e.primaryKeyword && (
                        <div className="text-[11px] text-text3 mt-0.5 flex items-center gap-2">
                          <span>🔑 {e.primaryKeyword}</span>
                          {e.estimatedVolume && <span>· {e.estimatedVolume}/měs</span>}
                          {e.competitionLevel && (
                            <span className={COMPETITION_CLS[e.competitionLevel] ?? ''}>
                              · {e.competitionLevel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${sc.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
