import Link from 'next/link'
import { getStrategyGoals, getCalendarEntries, getKeywordStats, currentQuarterLabel } from '@/lib/content-strategy-db'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Obsahová strategie | Admin' }

const QUARTER_LABEL: Record<string, string> = {
  Q1_2026: 'Q1 2026 — Květen–Červenec',
  Q2_2026: 'Q2 2026 — Srpen–Říjen',
  Q3_2026: 'Q3 2026 — Říjen–Prosinec',
  Q4_2026: 'Q4 2026 — Leden–Duben 2027',
}

const GOAL_TYPE_EMOJI: Record<string, string> = {
  traffic: '📈', articles: '📝', landing_pages: '🗂️', brand_reviews: '⭐',
  pillar_pages: '🏛️', newsletter: '📧', revenue: '💰',
}

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  in_progress: { cls: 'bg-blue-50 text-blue-700', label: 'Probíhá' },
  achieved:    { cls: 'bg-green-50 text-green-700', label: 'Splněno' },
  missed:      { cls: 'bg-red-50 text-red-700', label: 'Nesplněno' },
  pending:     { cls: 'bg-off text-text3', label: 'Čeká' },
}

function formatUnit(value: number, unit: string) {
  if (unit === 'kc') return `${value.toLocaleString('cs-CZ')} Kč`
  if (unit === 'visits') return `${value.toLocaleString('cs-CZ')} návštěv`
  return `${value} ${unit}`
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0)
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-off2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-olive' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-text3 w-8 text-right">{pct}%</span>
    </div>
  )
}

export default async function ContentStrategyPage() {
  const quarter = currentQuarterLabel()
  const [allGoals, calendarEntries, keywordStats] = await Promise.all([
    getStrategyGoals(),
    getCalendarEntries({ from: new Date().toISOString().slice(0, 10), limit: 100 }),
    getKeywordStats(),
  ])

  const quarters = ['Q1_2026', 'Q2_2026', 'Q3_2026', 'Q4_2026']
  const goalsByQuarter = Object.fromEntries(
    quarters.map((q) => [q, allGoals.filter((g) => g.quarter === q)])
  )

  const now = new Date()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const thisWeek = calendarEntries.filter((e) => {
    const d = new Date(e.scheduledWeek)
    return d >= now && d < new Date(now.getTime() + weekMs)
  })
  const next4Weeks = calendarEntries.filter((e) => {
    const d = new Date(e.scheduledWeek)
    return d >= now && d < new Date(now.getTime() + 4 * weekMs)
  })

  // Sezónní upozornění
  const harvestStart = new Date('2026-09-01')
  const weeksToHarvest = Math.round((harvestStart.getTime() - now.getTime()) / weekMs)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-text">Obsahová strategie 2026</h1>
          <p className="text-[13px] text-text2 mt-0.5">Kvartální cíle · Editoriální kalendář · Keyword mapping</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/content-calendar" className="text-[13px] bg-white border border-off2 rounded-lg px-3 py-1.5 text-text2 hover:text-text">
            Kalendář →
          </Link>
          <Link href="/admin/keyword-mapping" className="text-[13px] bg-white border border-off2 rounded-lg px-3 py-1.5 text-text2 hover:text-text">
            Keywords →
          </Link>
        </div>
      </div>

      {/* Sezónní alert */}
      {weeksToHarvest > 0 && weeksToHarvest <= 16 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-card)] px-4 py-3 text-[13px] text-amber-800">
          🍂 Za <strong>{weeksToHarvest} týdnů</strong> začíná sklizňová sezóna — připrav harvest obsah v kalendáři.
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tento týden', value: thisWeek.length, sub: 'plánovaných', href: '/admin/content-calendar' },
          { label: 'Další 4 týdny', value: next4Weeks.length, sub: 'plánovaných', href: '/admin/content-calendar' },
          { label: 'Keywords celkem', value: keywordStats.total, sub: `${keywordStats.mapped} namapovaných`, href: '/admin/keyword-mapping' },
          { label: 'High-pri unmapped', value: keywordStats.highPriorityUnmapped, sub: 'keywords priority 4–5', href: '/admin/keyword-mapping' },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="bg-white border border-off2 rounded-[var(--radius-card)] p-4 hover:shadow-sm">
            <div className="text-[22px] font-semibold text-text">{s.value}</div>
            <div className="text-[12px] font-medium text-text mt-0.5">{s.label}</div>
            <div className="text-[11px] text-text3">{s.sub}</div>
          </Link>
        ))}
      </div>

      {/* Goals per quarter */}
      {quarters.map((q) => {
        const goals = goalsByQuarter[q] ?? []
        if (goals.length === 0) return null
        const isCurrent = q === quarter
        return (
          <div key={q} className={`bg-white border rounded-[var(--radius-card)] p-5 ${isCurrent ? 'border-olive/40 ring-1 ring-olive/20' : 'border-off2'}`}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[14px] font-semibold text-text">{QUARTER_LABEL[q] ?? q}</h2>
              {isCurrent && (
                <span className="text-[10px] font-bold tracking-widest uppercase text-olive bg-olive-bg/60 px-2 py-0.5 rounded-full">
                  Aktuální
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {goals.map((g) => {
                const sc = STATUS_CONFIG[g.status] ?? STATUS_CONFIG.pending
                return (
                  <div key={g.id} className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[13px] text-text">
                        <span>{GOAL_TYPE_EMOJI[g.goalType] ?? '🎯'}</span>
                        <span>{g.goalName}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-text3 mt-0.5">
                      {formatUnit(g.currentValue, g.unit)} / {formatUnit(g.targetValue, g.unit)}
                    </div>
                    <ProgressBar current={g.currentValue} target={g.targetValue} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
