'use client'

import { useMemo, useState, useEffect } from 'react'

interface PricePoint {
  date: string   // YYYY-MM-DD
  price: number
  synthetic?: true  // today extension — not a real DB record
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

function fmtShort(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}. ${d.getMonth() + 1}.`
}

function fmtLong(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`
}

function pickLabelIndices(n: number): number[] {
  if (n <= 1) return [0]
  if (n <= 4) return Array.from({ length: n }, (_, i) => i)
  const count = 4
  const step = (n - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => Math.round(i * step))
}

export function PriceSparkline({ data, currentPrice, currency: _currency = 'CZK' }: Props) {
  const [range, setRange] = useState<RangeOption>(() => (data.length < 30 ? 0 : 30))
  // hover.pxLeft = pixel offset from left of SVG container (already clamped)
  const [hover, setHover] = useState<{ idx: number; pxLeft: number } | null>(null)

  // Clear tooltip on scroll — mouseleave does NOT fire on wheel/touch scroll
  useEffect(() => {
    const clear = () => setHover(null)
    window.addEventListener('scroll', clear, { passive: true })
    return () => window.removeEventListener('scroll', clear)
  }, [])

  // Extend last known price to today if currentPrice exists and data is stale
  const dataWithToday = useMemo(() => {
    if (!currentPrice || data.length === 0) return data
    const today = new Date().toISOString().slice(0, 10)
    const last = data[data.length - 1]
    if (last.date >= today) return data
    return [...data, { date: today, price: currentPrice, synthetic: true as const }]
  }, [data, currentPrice])

  const filtered = useMemo(() => {
    if (range === 0) return dataWithToday
    return dataWithToday.slice(-range)
  }, [dataWithToday, range])

  if (dataWithToday.length < 2) {
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

  const synthStart = filtered.findIndex((d) => d.synthetic)
  const realEnd = synthStart >= 0 ? synthStart : filtered.length - 1
  const polylineReal = xs.slice(0, realEnd + 1).map((x, i) => `${x},${ys[i]}`).join(' ')

  const polylineExt = synthStart >= 0
    ? `${xs[synthStart - 1]},${ys[synthStart - 1]} ${xs[synthStart]},${ys[synthStart]}`
    : null

  const fillPts = [
    `${xs[0]},${H}`,
    ...xs.slice(0, realEnd + 1).map((x, i) => `${x},${ys[i]}`),
    `${xs[realEnd]},${H}`,
  ].join(' ')

  const lastX = xs[xs.length - 1]
  const lastY = ys[ys.length - 1]

  const realFiltered = filtered.filter((d) => !d.synthetic)
  const firstPrice = realFiltered[0]?.price ?? filtered[0].price
  const lastRealPrice = realFiltered[realFiltered.length - 1]?.price ?? filtered[filtered.length - 1].price
  const diff = lastRealPrice - firstPrice
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

  const hoverPt = hover !== null ? filtered[hover.idx] : null
  const hoverX = hover !== null ? xs[hover.idx] : null
  const hoverY = hover !== null ? ys[hover.idx] : null

  // Tooltip position: pixel-accurate from mouse event, clamped in JS (not CSS).
  // Computed during onMouseMove using the SVG's actual rendered width.
  // This avoids the CSS clamp(px, %, px) mismatch that shifted the tooltip
  // 40 px left of the dot on wide viewports.
  const TOOLTIP_HALF_W = 55  // half of max tooltip width (~110 px)

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    let closest = 0
    let minDist = Infinity
    xs.forEach((x, i) => {
      const dist = Math.abs(x - svgX)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    // Dot position in container-pixel space (SVG is w-full so rect.width === container width)
    const dotPx = (xs[closest] / W) * rect.width
    const pxLeft = Math.max(TOOLTIP_HALF_W, Math.min(dotPx, rect.width - TOOLTIP_HALF_W))
    setHover({ idx: closest, pxLeft })
  }

  function clearHover() {
    setHover(null)
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

      {/* Chart wrapper — onMouseLeave as safety net for fast cursor exits */}
      <div className="relative" onMouseLeave={clearHover}>
        {/* Tooltip — positioned with JS-computed px left, hidden when not hovering */}
        {hoverPt && hover !== null && (
          <div
            className="absolute -top-1 pointer-events-none z-10"
            style={{ left: hover.pxLeft, transform: 'translateX(-50%)' }}
          >
            <div className="bg-text text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
              <div className="font-semibold tabular-nums">{formatCzk(hoverPt.price)}</div>
              <div className="text-white/65 text-[10px]">
                {fmtLong(hoverPt.date)}
                {hoverPt.synthetic && <span className="ml-1 opacity-60">aktuální</span>}
              </div>
            </div>
          </div>
        )}

        {/* SVG chart */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ height: H }}
          aria-label="Graf vývoje ceny"
          onMouseMove={onMouseMove}
          onMouseLeave={clearHover}
          onTouchEnd={clearHover}
        >
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          <polygon points={fillPts} fill="url(#sparkGrad)" />

          {realEnd >= 1 && (
            <polyline
              points={polylineReal}
              fill="none"
              stroke={lineColor}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {polylineExt && (
            <polyline
              points={polylineExt}
              fill="none"
              stroke={lineColor}
              strokeWidth="1.4"
              strokeDasharray="4 3"
              strokeOpacity="0.5"
              strokeLinecap="round"
            />
          )}

          {hoverX !== null && hoverY !== null && (
            <>
              <line
                x1={hoverX} y1={PAD.top - 2}
                x2={hoverX} y2={H - PAD.bottom}
                stroke={lineColor} strokeWidth="0.8" strokeDasharray="3 2" strokeOpacity="0.5"
              />
              <circle
                cx={hoverX} cy={hoverY} r="4"
                fill={hoverPt?.synthetic ? 'white' : lineColor}
                stroke={lineColor} strokeWidth="1.5"
              />
            </>
          )}

          {hover === null && (
            <circle
              cx={lastX} cy={lastY} r="3.5"
              fill={filtered[filtered.length - 1]?.synthetic ? 'white' : lineColor}
              stroke={lineColor} strokeWidth="1.5"
            />
          )}
        </svg>

        {/* X-axis date labels */}
        <div className="relative h-4 mt-0.5">
          {labelIndices.map((idx) => {
            const xPctLabel = filtered.length === 1 ? 50 : (xs[idx] / W) * 100
            const isFirst = idx === 0
            const isLast = idx === filtered.length - 1
            const isSynth = filtered[idx]?.synthetic
            return (
              <span
                key={idx}
                className={`absolute text-[9px] leading-none whitespace-nowrap ${
                  isSynth ? 'text-text3/50 italic' : 'text-text3'
                }`}
                style={{
                  left: isFirst ? 0 : isLast ? 'auto' : `${xPctLabel}%`,
                  right: isLast ? 0 : 'auto',
                  transform: !isFirst && !isLast ? 'translateX(-50%)' : 'none',
                }}
              >
                {fmtShort(filtered[idx].date)}
                {isSynth && ' •'}
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
