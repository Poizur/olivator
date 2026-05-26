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

type RangeOption = 30 | 90 | 0

function formatCzk(n: number) {
  return n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
}

/** "15. 3." */
function fmtShort(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}. ${d.getMonth() + 1}.`
}

/** "15. 3. 2025" */
function fmtLong(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`
}

/** Vrátí max 4 rovnoměrně rozmístěné indexy (vždy první + poslední) */
function pickLabelIndices(n: number): number[] {
  if (n <= 1) return [0]
  if (n <= 4) return Array.from({ length: n }, (_, i) => i)
  const count = 4
  const step = (n - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => Math.round(i * step))
}

export function PriceSparkline({ data, currentPrice, currency: _currency = 'CZK' }: Props) {
  const [range, setRange] = useState<RangeOption>(() => (data.length < 30 ? 0 : 30))
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

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
  const rangeLabel = range === 0 ? `za ${totalDays} dní sledování` : `za posledních ${range} dní`

  const labelIndices = pickLabelIndices(filtered.length)

  // Aktuálně hoverovaný bod
  const hoverPt = hoverIdx !== null ? filtered[hoverIdx] : null
  const hoverX = hoverIdx !== null ? xs[hoverIdx] : null
  const hoverY = hoverIdx !== null ? ys[hoverIdx] : null

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    let closest = 0
    let minDist = Infinity
    xs.forEach((x, i) => {
      const dist = Math.abs(x - svgX)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    setHoverIdx(closest)
  }

  // Tooltip: zabrání přetečení na krajích
  function tooltipLeft(xPct: number) {
    if (xPct < 15) return '0%'
    if (xPct > 85) return 'auto'
    return `${xPct}%`
  }
  function tooltipRight(xPct: number) {
    if (xPct > 85) return '0%'
    return 'auto'
  }
  function tooltipTransform(xPct: number) {
    if (xPct < 15) return 'none'
    if (xPct > 85) return 'none'
    return 'translateX(-50%)'
  }

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

      {/* Chart wrapper — relative pro tooltip overlay */}
      <div className="relative">
        {/* Hover tooltip */}
        {hoverPt && hoverX !== null && (() => {
          const xPct = (hoverX / W) * 100
          return (
            <div
              className="absolute -top-1 pointer-events-none z-10"
              style={{
                left: tooltipLeft(xPct),
                right: tooltipRight(xPct),
                transform: tooltipTransform(xPct),
              }}
            >
              <div className="bg-text text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                <div className="font-semibold tabular-nums">{formatCzk(hoverPt.price)}</div>
                <div className="text-white/65 text-[10px]">{fmtLong(hoverPt.date)}</div>
              </div>
            </div>
          )
        })()}

        {/* SVG chart */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ height: H }}
          aria-label="Graf vývoje ceny"
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
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

          {/* Hover: svislá čára + zvýrazněný bod */}
          {hoverX !== null && hoverY !== null && (
            <>
              <line
                x1={hoverX} y1={PAD.top - 2}
                x2={hoverX} y2={H - PAD.bottom}
                stroke={lineColor} strokeWidth="0.8" strokeDasharray="3 2" strokeOpacity="0.5"
              />
              <circle cx={hoverX} cy={hoverY} r="4" fill={lineColor} stroke="white" strokeWidth="1.5" />
            </>
          )}

          {/* Výchozí koncový bod (když nehoverujeme) */}
          {hoverIdx === null && (
            <circle cx={lastX} cy={lastY} r="3.5" fill={lineColor} />
          )}
        </svg>

        {/* X-osa: datumové popisky */}
        <div className="relative h-4 mt-0.5">
          {labelIndices.map((idx) => {
            const xPct = filtered.length === 1 ? 50 : (xs[idx] / W) * 100
            const isFirst = idx === 0
            const isLast = idx === filtered.length - 1
            return (
              <span
                key={idx}
                className="absolute text-[9px] text-text3 leading-none whitespace-nowrap"
                style={{
                  left: isFirst ? 0 : isLast ? 'auto' : `${xPct}%`,
                  right: isLast ? 0 : 'auto',
                  transform: !isFirst && !isLast ? 'translateX(-50%)' : 'none',
                }}
              >
                {fmtShort(filtered[idx].date)}
              </span>
            )
          })}
        </div>
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between mt-1 text-[10px] text-text3">
        <span>Min {formatCzk(minP)}</span>
        <span>Max {formatCzk(maxP)}</span>
      </div>
    </div>
  )
}
