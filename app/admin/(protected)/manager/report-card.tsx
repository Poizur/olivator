interface ReportRow {
  id: string
  generated_at: string
  period_start: string
  period_end: string
  metrics: unknown
  ai_analysis: string
  suggested_actions: unknown
  status: string
}

interface SuggestedAction {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: string
  completed?: boolean
}

interface Metrics {
  totalActiveProducts?: number
  totalClicks?: number
  offersWithoutAffiliate?: number
  totalOffers?: number
  newCandidatesThisWeek?: number
  candidatesPending?: number
  openQualityIssues?: number
  productsLowCompleteness?: number
  topScoreProducts?: Array<{ slug: string; name: string; score: number }>
  clicksByProduct?: Array<{ slug: string; name: string; clicks: number }>
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
}

const CATEGORY_LABEL: Record<string, string> = {
  seo: 'SEO',
  content: 'Obsah',
  affiliate: 'Affiliate',
  quality: 'Kvalita',
  technical: 'Technické',
}

export function ReportCard({ report }: { report: ReportRow }) {
  const m = (report.metrics ?? {}) as Metrics
  const actions: SuggestedAction[] = Array.isArray(report.suggested_actions)
    ? (report.suggested_actions as SuggestedAction[])
    : []

  const generatedDate = new Date(report.generated_at).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
      <div className="bg-olive-bg/40 px-6 py-3 border-b border-off2">
        <div className="text-xs text-olive-dark font-semibold tracking-wider uppercase">
          {report.period_start} — {report.period_end}
        </div>
        <div className="text-[11px] text-text3 mt-0.5">
          Vygenerováno {generatedDate}
        </div>
      </div>

      <div className="p-6">
        <div className="text-[14px] text-text leading-relaxed whitespace-pre-line mb-6">
          {report.ai_analysis}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Metric label="Aktivní produkty" value={m.totalActiveProducts ?? 0} />
          <Metric label="Affiliate kliky" value={m.totalClicks ?? 0} highlight={(m.totalClicks ?? 0) > 0} />
          <Metric
            label="Offers bez aff URL"
            value={`${m.offersWithoutAffiliate ?? 0}/${m.totalOffers ?? 0}`}
            warning={
              m.totalOffers != null && m.offersWithoutAffiliate != null && m.offersWithoutAffiliate > m.totalOffers / 2
            }
          />
          <Metric label="Nové kandidáty" value={m.newCandidatesThisWeek ?? 0} />
        </div>

        {actions.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-2.5">
              Akce na příští týden
            </div>
            <ul className="space-y-2.5">
              {actions.map((a, i) => (
                <li
                  key={i}
                  className="border border-off2 rounded-lg p-3 bg-off/30"
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${PRIORITY_BADGE[a.priority] ?? PRIORITY_BADGE.medium}`}>
                      {a.priority}
                    </span>
                    <span className="text-[11px] text-text3">
                      {CATEGORY_LABEL[a.category] ?? a.category}
                    </span>
                  </div>
                  <div className="text-[14px] font-semibold text-text mb-1">{a.title}</div>
                  <div className="text-[13px] text-text2 leading-relaxed">{a.description}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  highlight,
  warning,
}: {
  label: string
  value: string | number
  highlight?: boolean
  warning?: boolean
}) {
  return (
    <div className="bg-off/40 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-text3 mb-1">{label}</div>
      <div
        className={`text-lg font-semibold tabular-nums ${
          warning ? 'text-red-600' : highlight ? 'text-olive-dark' : 'text-text'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
