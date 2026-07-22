// Server component — bez 'use client', plně SSR. AI crawlery vidí score breakdown v raw HTML.
// Vizuálně identický se score-section.tsx rows. CSS-only hover tooltip funguje bez JS.
import type { Product } from '@/lib/types'

const SCORE_TOOLTIPS: Record<string, string> = {
  Kyselost:      'Kyselost ukazuje jak je olej čerstvý. Čím nižší, tím lepší.',
  Certifikace:   'Certifikáty = razítka která potvrzují kvalitu nezávislí kontroloři.',
  Polyfenoly:    'Polyfenoly jsou přírodní antioxidanty které dělají olej zdravým. Čím víc, tím lepší.',
  'Cena / kvalita': 'Měříme jestli platíš za chuť a kvalitu, ne za marketing a krásnou láhev.',
}

interface ScoreBreakdownSSRProps {
  product: Product
}

export function ScoreBreakdownSSR({ product }: ScoreBreakdownSSRProps) {
  const { scoreBreakdown, olivatorScore: total } = product

  const rows = [
    {
      label: 'Kyselost',
      displayValue: product.acidity != null ? `${product.acidity} %` : '— chybí',
      missing: product.acidity == null,
      subScore: Math.round(scoreBreakdown.acidity),
      max: 35,
    },
    {
      label: 'Certifikace',
      displayValue: product.certifications.length > 0
        ? product.certifications.map(c => c.toUpperCase()).join(' + ')
        : 'Žádné',
      missing: false,
      subScore: Math.round(scoreBreakdown.certifications),
      max: 25,
    },
    {
      label: 'Polyfenoly',
      displayValue: product.polyphenols != null ? `${product.polyphenols} mg/kg` : '— chybí',
      missing: product.polyphenols == null,
      subScore: Math.round(scoreBreakdown.quality),
      max: 25,
    },
    {
      label: 'Cena / kvalita',
      displayValue: scoreBreakdown.value >= 12 ? 'Výborná' : scoreBreakdown.value >= 8 ? 'Dobrá' : 'Průměrná',
      missing: false,
      subScore: Math.round(scoreBreakdown.value),
      max: 15,
    },
  ]

  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="relative group flex items-center gap-2 bg-white rounded-lg px-3 py-2">
          {/* CSS-only tooltip — visible on hover without JS */}
          <div className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:block z-30">
            <div className="bg-text text-white text-[11px] rounded-lg px-3 py-2 w-56 leading-snug shadow-lg">
              {SCORE_TOOLTIPS[row.label]}
            </div>
            <div className="w-2 h-2 bg-text rotate-45 ml-4 -mt-1" />
          </div>

          <span className="text-[11px] text-text3 uppercase tracking-wider w-[72px] shrink-0">
            {row.label}
          </span>
          <span className={`text-[13px] font-medium flex-1 truncate ${row.missing ? 'text-text3 italic' : 'text-text'}`}>
            {row.displayValue}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-14 h-1.5 bg-off2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-olive"
                style={{ width: `${(row.subScore / row.max) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-text3 tabular-nums w-9 text-right">
              {row.subScore}/{row.max}
            </span>
          </div>
        </div>
      ))}

      {scoreBreakdown.functionalBonus != null && scoreBreakdown.functionalBonus > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-[11px] text-amber-700 uppercase tracking-wider w-[72px] shrink-0">Bonus</span>
          <span className="text-[13px] font-medium flex-1 text-amber-800">
            {product.polyphenols} mg/kg — funkční olej
          </span>
          <span className="text-[13px] font-bold text-amber-700 tabular-nums shrink-0">
            +{scoreBreakdown.functionalBonus}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
        <span className="text-[11px] font-semibold text-olive uppercase tracking-wider flex-1">
          Olivator Score
        </span>
        <span className="text-[14px] font-bold text-terra tabular-nums">{total}/100</span>
      </div>
    </div>
  )
}
