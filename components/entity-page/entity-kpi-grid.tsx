// Blok 2: KPI boxíky — 3 až 4 čísla v gridu.
// Mobil: 2 sloupce. Desktop: 3-4 sloupce dle počtu.

import type { KpiItem } from './types'

export function EntityKpiGrid({ items }: { items: KpiItem[] }) {
  if (items.length === 0) return null

  const cols =
    items.length === 4 ? 'lg:grid-cols-4' :
    items.length === 3 ? 'lg:grid-cols-3' :
    'lg:grid-cols-2'

  return (
    <section className="px-6 md:px-10">
      <div className={`max-w-[1280px] mx-auto grid grid-cols-2 ${cols} gap-3 md:gap-4`}>
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-off2 rounded-[var(--radius-card)] p-5"
          >
            <div className="text-[11px] text-text3 uppercase tracking-widest font-medium mb-1.5">
              {item.label}
            </div>
            <div className="font-[family-name:var(--font-display)] text-2xl md:text-[28px] font-normal text-text leading-tight">
              {item.value}
            </div>
            {item.hint && (
              <div className="text-[11px] text-text3 mt-1">{item.hint}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
