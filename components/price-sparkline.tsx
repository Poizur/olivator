'use client'

// Miniaturní graf vývoje ceny — SVG, bez knihoven.
// Zobrazuje nejnižší dostupnou cenu ze všech prodejců za každý den.
// Server fetchne max 365 dní; klient přepíná zobrazení 30/90/Vše.

import { useMemo, useState } from 'react'

interface PricePoint {
  date: string   // YYYY-MM-DD
  price: number
}

interface Props {
  data: PricePoint[]
  currentPrice: number | null
  currency?: string
}

type RangeOption = 30 | 90 | 0  // 0 = vše dostupné

function formatCzk(n: number) {
  return n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
}

export function PriceSparkline({ data, currentPrice: _currentPrice, currency: _currency = 'CZK' }: Props) {
  // Default: pokud máme < 30 dní dat, ukážeme vše. Jinak 30 dní.
  const [range, setRange] = useState<RangeOption>(() => (data.length < 30 ? 0 : 30))

  // Filter podle range — kompletně lokálně, server posílá 365 dní jednou
  const filtered = useMemo(() => {
    if (range === 0) return data
    return data.slice(-range)
  }, [data, range])

  if (data.length < 2) {
    return (
      <div className="mt-4 border-t border-off pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-text2 tracking-wide">Vývoj ceny</span>
        </div>
        <div className="h-14 flex items-center justify-center border border-dashed border-off2 rounded-xl">
          <p className="text-[11px] text-text3 italic text-center px-4">
            {data.length === 0
              ? 'Sledování ceny začalo dnes — graf bude dostupný za několik dní.'
              : 'Sbíráme data, graf brzy.'}
          </p>
        </div>
      </div>
    )
  }

  const W = 320
  const H = 56
  const PAD = { top: 6, right: 4, bottom: 4, left: 4 }

  const prices = filtered.map((d) => d.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const priceRange = maxP - minP || 1

  const xs = filtered.map((_, i) =>
    PAD.left + (filtered.length === 1 ? 0 : (i / (filtered.length - 1)) * (W - PAD.left - PAD.right))
  )
  const ys = filtered.map((d) => PAD.top + ((maxP - d.price) / priceRange) * (H - PAD.top - PAD.bottom))

  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ')

  const fillPts = [
    `${xs[0]},${H - PAD.bottom}`,
    ...xs.map((x, i) => `${x},${ys[i]}`),
    `${xs[xs.length - 1]},${H - PAD.bottom}`,
  ].join(' ')

  const lastY = ys[ys.length - 1]
  const lastX = xs[xs.length - 1]

  const firstPrice = filtered[0].price
  const lastPrice = filtered[filtered.length - 1].price
  const trend = lastPrice < firstPrice ? 'down' : lastPrice > firstPrice ? 'up' : 'flat'
  const trendColor = trend === 'down' ? '#2d6a4f' : trend === 'up' ? '#c4711a' : '#aeaeb2'
  const trendLabel = trend === 'down' ? '↓ Cena klesla' : trend === 'up' ? '↑ Cena vzrostla' : '→ Stabilní'

  const days = filtered.length
  const startDate = new Date(filtered[0].date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
  const endDate = new Date(filtered[filtered.length - 1].date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })

  // Range buttons — disable pokud na to nemáme data (např. 90 dní pokud máme jen 8 dní)
  const totalDays = data.length
  const rangeOptions: { value: RangeOption; label: string; available: boolean }[] = [
    { value: 30, label: '30 dní', available: totalDays >= 2 },
    { value: 90, label: '90 dní', available: totalDays > 30 },
    { value: 0, label: `Vše (${totalDays})`, available: true },
  ]

  return (
    <div className="mt-4 border-t border-off pt-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <span className="text-[12px] font-semibold text-text2 tracking-wide">Vývoj ceny</span>
        <div className="flex gap-1">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => opt.available && setRange(opt.value)}
              disabled={!opt.available}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                range === opt.value
                  ? 'bg-olive text-white'
                  : 'bg-off text-text2 hover:bg-off2'
              }`}
              title={!opt.available ? `Zatím nemáme dostatek dat (potřeba ${opt.value}+ dní)` : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: H }}
          aria-label="Graf vývoje ceny"
        >
          <polygon points={fillPts} fill="#2d6a4f" opacity="0.07" />
          <polyline
            points={polyline}
            fill="none"
            stroke="#2d6a4f"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={lastX} cy={lastY} r="3" fill="#2d6a4f" />
        </svg>

        <div className="flex justify-between mt-1 gap-2 text-[10px]">
          <span className="text-text3">Min {formatCzk(minP)}</span>
          <span className="text-text3 hidden sm:inline">
            {startDate} – {endDate} ({days} {days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'})
          </span>
          <span style={{ color: trendColor }}>{trendLabel}</span>
          <span className="text-text3">Max {formatCzk(maxP)}</span>
        </div>
      </div>
    </div>
  )
}
