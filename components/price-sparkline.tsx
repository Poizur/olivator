'use client'

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

type RangeOption = 30 | 90 | 0  // 0 = vše

function formatCzk(n: number) {
  return n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
}

export function PriceSparkline({ data, currentPrice, currency: _currency = 'CZK' }: Props) {
  const [range, setRange] = useState<RangeOption>(() => (data.length < 30 ? 0 : 30))

  const filtered = useMemo(() => {
    if (range === 0) return data
    return data.slice(-range)
  }, [data, range])

  if (data.length < 2) {
    return (
      <div className="mt-4 pt-4 border-t border-off">
        <p className="text-[11px] text-text3 italic text-center py-3">
          {data.length === 0
            ? 'Sledování ceny začalo dnes — za pár dní ukážeme vývoj.'
            : 'Sbíráme data, graf brzy.'}
        </p>
      </div>
    )
  }

  const W = 320
  const H = 72
  const PAD = { top: 8, right: 4, bottom: 6, left: 4 }

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
    `${xs[0]},${H}`,
    ...xs.map((x, i) => `${x},${ys[i]}`),
    `${xs[xs.length - 1]},${H}`,
  ].join(' ')

  const lastX = xs[xs.length - 1]
  const lastY = ys[ys.length - 1]

  const firstPrice = filtered[0].price
  const lastPrice = filtered[filtered.length - 1].price
  const diff = lastPrice - firstPrice
  const trend = diff < -0.5 ? 'down' : diff > 0.5 ? 'up' : 'flat'

  const isAtMin = currentPrice !== null && currentPrice <= minP + 0.5
  const isAtMax = currentPrice !== null && currentPrice >= maxP - 0.5

  const lineColor = trend === 'up' ? '#c4711a' : '#2d6a4f'

  const totalDays = data.length
  const rangeOptions: { value: RangeOption; label: string; available: boolean }[] = [
    { value: 30, label: '30 d', available: totalDays >= 2 },
    { value: 90, label: '90 d', available: totalDays > 30 },
    { value: 0, label: 'Vše', available: true },
  ]

  const heroText = trend === 'down'
    ? `Klesla o ${formatCzk(Math.abs(diff))}`
    : trend === 'up'
    ? `Vzrostla o ${formatCzk(Math.abs(diff))}`
    : 'Cena je stabilní'

  const heroArrow = trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'
  const heroColorClass = trend === 'down' ? 'text-olive' : trend === 'up' ? 'text-terra' : 'text-text3'

  const rangeLabel = range === 0
    ? `za ${totalDays} dní sledování`
    : `za posledních ${range} dní`

  return (
    <div className="mt-4 pt-4 border-t border-off">
      {/* Trend headline + range toggles */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className={`flex items-baseline gap-1.5 ${heroColorClass}`}>
            <span className="text-[20px] font-bold leading-none">{heroArrow}</span>
            <span className="text-[16px] font-bold leading-tight">{heroText}</span>
          </div>
          <div className="text-[11px] text-text3 mt-0.5">{rangeLabel}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => opt.available && setRange(opt.value)}
              disabled={!opt.available}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                range === opt.value ? 'bg-olive text-white' : 'bg-off text-text2 hover:bg-off2'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contextual buy-signal badges */}
      {isAtMin && (
        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-olive-dark bg-olive-bg border border-olive-border rounded-full px-3 py-1 mb-3">
          ✓ Teď nejlevněji v tomto období
        </div>
      )}
      {!isAtMin && isAtMax && (
        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-terra bg-terra-bg border border-terra/20 rounded-full px-3 py-1 mb-3">
          ↑ Aktuálně na maximu
        </div>
      )}

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        aria-label="Graf vývoje ceny"
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill="url(#sparkGrad)" />
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastX} cy={lastY} r="3.5" fill={lineColor} />
      </svg>

      {/* Min / Max labels */}
      <div className="flex justify-between mt-1.5 text-[10px] text-text3">
        <span>Min {formatCzk(minP)}</span>
        <span>Max {formatCzk(maxP)}</span>
      </div>
    </div>
  )
}
