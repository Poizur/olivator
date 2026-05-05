// Blok 6 pro značku: časová osa + portfolio rozklad.
// Brief.md říkal i graf skóre v čase — vyhozeno z MVP (nemáme historická data).

interface TimelineMilestone {
  year: number
  label: string
  description?: string
}

interface PortfolioBucket {
  label: string         // např. "Prémium monovarietály"
  count: number
  hint?: string         // krátká nota
}

interface Props {
  brandName: string
  timeline: TimelineMilestone[]
  portfolio: PortfolioBucket[]
}

export function BrandStory({ brandName, timeline, portfolio }: Props) {
  // Skryj buckety s 0 produkty — admin nezná cultivary nebo brand má jen
  // monovarietály (zbytek 0 → matoucí "0 blendů, 0 specialit")
  const visiblePortfolio = portfolio.filter((p) => p.count > 0)
  const hasContent = timeline.length > 0 || visiblePortfolio.length > 0
  if (!hasContent) return null

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto bg-olive-bg/40 rounded-[var(--radius-card)] p-6 md:p-8">
        <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-3">
          — Příběh a portfolio
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text mb-6">
          Komu dáváte peníze
        </h2>

        {timeline.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive mb-4">
              Časová osa
            </h3>
            <div className="relative pl-6 border-l-2 border-olive/30 space-y-5">
              {timeline.map((m, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-olive ring-4 ring-olive-bg" />
                  <div className="text-[12px] font-bold text-olive tabular-nums mb-0.5">{m.year}</div>
                  <div className="text-[15px] font-medium text-text">{m.label}</div>
                  {m.description && (
                    <p className="text-[13px] text-text2 font-light leading-relaxed mt-1">
                      {m.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {visiblePortfolio.length > 0 && (
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive mb-4">
              Portfolio {brandName}
            </h3>
            <div className={`grid grid-cols-1 gap-3 ${visiblePortfolio.length === 1 ? 'md:grid-cols-1' : visiblePortfolio.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {visiblePortfolio.map((bucket, i) => (
                <div
                  key={i}
                  className="bg-white border border-off2 rounded-[var(--radius-card)] p-4"
                >
                  <div className="font-[family-name:var(--font-display)] text-3xl font-normal text-olive mb-1 tabular-nums">
                    {bucket.count}
                  </div>
                  <div className="text-[13px] font-medium text-text leading-tight">
                    {bucket.label}
                  </div>
                  {bucket.hint && (
                    <div className="text-[11px] text-text3 mt-1.5 leading-snug">{bucket.hint}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
