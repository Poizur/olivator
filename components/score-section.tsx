'use client'

import { useState } from 'react'
import type { Product } from '@/lib/types'

export function ScoreSection({ product }: { product: Product }) {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const { scoreBreakdown } = product
  const total = product.olivatorScore

  const items = [
    { label: 'Kyselost', value: `${product.acidity} %`, weight: '35 %' },
    { label: 'Polyfenoly', value: `${product.polyphenols} mg/kg`, weight: '25 %' },
    { label: 'Certifikace', value: product.certifications.length > 0 ? product.certifications.map(c => c.toUpperCase()).join(' + ') : 'Žádné', weight: '25 %' },
    { label: 'Hodnota', value: scoreBreakdown.value >= 20 ? 'Výborná' : scoreBreakdown.value >= 10 ? 'Dobrá' : 'Průměrná', weight: '15 %' },
  ]

  return (
    <div className="bg-off rounded-xl p-5 mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-medium text-text">Olivator Score</div>
        <div className="flex items-center gap-1.5 relative">
          <span className="text-[22px] font-bold text-terra tracking-tight">{total} / 100</span>
          <button
            onClick={() => setTooltipOpen(!tooltipOpen)}
            className="w-4 h-4 rounded-full bg-off2 border-none cursor-pointer text-[10px] text-text2 flex items-center justify-center font-semibold shrink-0 transition-colors hover:bg-olive-bg hover:text-olive"
          >
            ?
          </button>
          {tooltipOpen && (
            <div className="absolute bottom-6 right-0 bg-white border border-off2 rounded-[var(--radius-card)] p-3.5 w-60 z-50 shadow-[0_8px_24px_rgba(0,0,0,.1)]">
              <div className="text-xs font-semibold text-text mb-2">Jak počítáme Score</div>
              {[
                { label: 'Kyselost', pct: '35 %' },
                { label: 'Certifikace', pct: '25 %' },
                { label: 'Polyfenoly + kvalita', pct: '25 %' },
                { label: 'Cena / kvalita', pct: '15 %' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1 border-b border-off last:border-b-0">
                  <span className="text-[11px] text-text2">{row.label}</span>
                  <span className="text-[11px] font-semibold text-olive">{row.pct}</span>
                </div>
              ))}
              <a href="/metodika" className="block text-center mt-2.5 text-[11px] text-olive cursor-pointer border-t border-off pt-2">
                Celá metodika →
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="h-1.5 bg-off2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-terra animate-score-fill"
          style={{ width: `${total}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3.5">
        {items.map(item => (
          <div key={item.label} className="bg-white rounded-lg p-2.5">
            <div className="text-[10px] text-text3 uppercase tracking-wider mb-0.5">
              {item.label}
            </div>
            <div className="text-sm font-semibold text-text">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
