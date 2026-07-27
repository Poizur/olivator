'use client'
import { useMemo, useState, useEffect } from 'react'

interface PricePoint { date: string; price: number; synthetic?: true }
interface Props { data: PricePoint[]; currentPrice: number | null; currency?: string }
type RangeOption = 30 | 90 | 0

const czk = (n: number) => n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
const dateLong = (s: string) => { const d = new Date(s); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` }
const dateShort = (s: string) => { const d = new Date(s); return `${d.getDate()}. ${d.getMonth() + 1}.` }
function pickLabelIdxs(n: number) {
  if (n <= 1) return [0]
  if (n <= 4) return Array.from({ length: n }, (_, i) => i)
  const step = (n - 1) / 3
  return [0, 1, 2, 3].map(i => Math.round(i * step))
}

const W = 320, H = 72, PL = 4, PR = 4, PT = 8, PB = 6

export function PriceSparkline({ data, currentPrice, currency: _c = 'CZK' }: Props) {
  const [range, setRange] = useState<RangeOption>(() => data.length < 30 ? 0 : 30)
  const [hov, setHov] = useState<{ idx: number; pxLeft: number } | null>(null)

  useEffect(() => {
    const hide = () => setHov(null)
    window.addEventListener('scroll', hide, { passive: true })
    return () => window.removeEventListener('scroll', hide)
  }, [])

  const allPts = useMemo(() => {
    if (!currentPrice || !data.length) return data
    const today = new Date().toISOString().slice(0, 10)
    const last = data[data.length - 1]
    return last.date >= today ? data : [...data, { date: today, price: currentPrice, synthetic: true as const }]
  }, [data, currentPrice])

  const slice = useMemo(() => range === 0 ? allPts : allPts.slice(-range), [allPts, range])

  if (allPts.length < 2) return (
    <div className="mt-4 pt-4 border-t border-off">
      <p className="text-[11px] text-text3 italic text-center py-3">
        {data.length === 0 ? 'Sledování ceny začalo dnes — za pár dní ukážeme vývoj.' : 'Sbíráme data, graf brzy.'}
      </p>
    </div>
  )

  // ONE source of truth — pts[] is used for both SVG drawing and tooltip snapping.
  // No separate xs/ys arrays. No dual coordinate calculations.
  const prices = slice.map(p => p.price)
  const minP = Math.min(...prices), maxP = Math.max(...prices), priceRange = maxP - minP || 1
  const n = slice.length
  const pts = slice.map((p, i) => ({
    ...p,
    xPx: PL + (n === 1 ? 0 : (i / (n - 1)) * (W - PL - PR)),
    yPx: PT + ((maxP - p.price) / priceRange) * (H - PT - PB),
  }))

  // synthIdx: index of synthetic today point, -1 if none.
  // solidEnd: index of the LAST REAL data point (never the synthetic one).
  // Solid polyline = real data only. Dashed extension = last real → today (if synthetic exists).
  const synthIdx = pts.findIndex(p => p.synthetic)
  const solidEnd = synthIdx >= 1 ? synthIdx - 1 : n - 1
  const solidPts = pts.slice(0, solidEnd + 1)
  const lastSolid = solidPts[solidPts.length - 1]

  const solidLine = solidPts.map(p => `${p.xPx},${p.yPx}`).join(' ')
  const fillPoly = [`${solidPts[0].xPx},${H}`, ...solidPts.map(p => `${p.xPx},${p.yPx}`), `${lastSolid.xPx},${H}`].join(' ')
  const dashLine = synthIdx >= 1
    ? `${lastSolid.xPx},${lastSolid.yPx} ${pts[synthIdx].xPx},${pts[synthIdx].yPx}`
    : null

  const realPts = pts.filter(p => !p.synthetic)
  const diff = realPts.length >= 2 ? realPts[realPts.length - 1].price - realPts[0].price : 0
  const trend = diff < -0.5 ? 'down' : diff > 0.5 ? 'up' : 'flat'
  const color = trend === 'up' ? '#c4711a' : '#2d6a4f'
  const isAtMin = currentPrice !== null && currentPrice <= minP + 0.5
  const isAtMax = currentPrice !== null && currentPrice >= maxP - 0.5

  const rangeOpts: { v: RangeOption; label: string; ok: boolean }[] = [
    { v: 30, label: '30 d', ok: data.length >= 2 },
    { v: 90, label: '90 d', ok: data.length > 30 },
    { v: 0, label: 'Vše', ok: true },
  ]
  const heroText = trend === 'down' ? `Klesla o ${czk(Math.abs(diff))}` : trend === 'up' ? `Vzrostla o ${czk(Math.abs(diff))}` : 'Cena je stabilní'
  const heroColor = trend === 'down' ? 'text-olive' : trend === 'up' ? 'text-terra' : 'text-text3'
  const rangeLabel = range === 0 ? `za ${data.length} dní sledování` : `za posledních ${range} dní`
  const lastPt = pts[n - 1]
  const hovPt = hov !== null ? pts[hov.idx] : null

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    // Convert mouse position to viewBox X coordinate
    const mouseX = ((e.clientX - r.left) / r.width) * W
    // Find closest point in pts[] — same array used for drawing
    let ci = 0, minD = Infinity
    pts.forEach((p, i) => { const d = Math.abs(p.xPx - mouseX); if (d < minD) { minD = d; ci = i } })
    // Convert dot position back to container pixels for tooltip placement
    const dotPx = (pts[ci].xPx / W) * r.width
    setHov({ idx: ci, pxLeft: Math.max(55, Math.min(dotPx, r.width - 55)) })
  }

  const clear = () => setHov(null)

  return (
    <div className="mt-4 pt-4 border-t border-off">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className={`flex items-baseline gap-1.5 ${heroColor}`}>
            <span className="text-[20px] font-bold leading-none">{trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'}</span>
            <span className="text-[16px] font-bold leading-tight">{heroText}</span>
          </div>
          <div className="text-[11px] text-text3 mt-0.5">{rangeLabel}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          {rangeOpts.map(o => (
            <button key={o.v} type="button" onClick={() => o.ok && setRange(o.v)} disabled={!o.ok}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${range === o.v ? 'bg-olive text-white' : 'bg-off text-text2 hover:bg-off2'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {isAtMin && <div className="inline-flex items-center gap-1 text-[11px] font-medium text-olive-dark bg-olive-bg border border-olive-border rounded-full px-3 py-1 mb-3">✓ Teď nejlevněji v tomto období</div>}
      {!isAtMin && isAtMax && <div className="inline-flex items-center gap-1 text-[11px] font-medium text-terra bg-terra-bg border border-terra/20 rounded-full px-3 py-1 mb-3">↑ Aktuálně na maximu</div>}

      <div className="relative" onMouseLeave={clear}>
        {hovPt && hov !== null && (
          <div className="absolute -top-1 pointer-events-none z-10" style={{ left: hov.pxLeft, transform: 'translateX(-50%)' }}>
            <div className="bg-text text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
              <div className="font-semibold tabular-nums">{czk(hovPt.price)}</div>
              <div className="text-white/65 text-[10px]">{dateLong(hovPt.date)}{hovPt.synthetic && <span className="ml-1 opacity-60">aktuální</span>}</div>
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" style={{ height: H }}
          aria-label="Graf vývoje ceny" onMouseMove={onMouseMove} onMouseLeave={clear} onTouchEnd={clear}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <polygon points={fillPoly} fill="url(#sparkGrad)" />
          {solidEnd >= 1 && <polyline points={solidLine} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />}
          {dashLine && <polyline points={dashLine} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.65" strokeLinecap="round" />}
          {hov !== null && hovPt && (
            <>
              <line x1={hovPt.xPx} y1={PT - 2} x2={hovPt.xPx} y2={H - PB} stroke={color} strokeWidth="0.8" strokeDasharray="3 2" strokeOpacity="0.5" />
              <circle cx={hovPt.xPx} cy={hovPt.yPx} r="4" fill={hovPt.synthetic ? 'white' : color} stroke={color} strokeWidth="1.5" />
            </>
          )}
          {hov === null && (
            <circle cx={lastPt.xPx} cy={lastPt.yPx} r="3.5" fill={lastPt.synthetic ? 'white' : color} stroke={color} strokeWidth="1.5" />
          )}
        </svg>

        <div className="relative h-4 mt-0.5">
          {pickLabelIdxs(n).map(idx => {
            const p = pts[idx]
            const isFirst = idx === 0, isLast = idx === n - 1
            return (
              <span key={idx} className={`absolute text-[9px] leading-none whitespace-nowrap ${p.synthetic ? 'text-text3/50 italic' : 'text-text3'}`}
                style={{ left: isFirst ? 0 : isLast ? 'auto' : `${(p.xPx / W) * 100}%`, right: isLast ? 0 : 'auto', transform: !isFirst && !isLast ? 'translateX(-50%)' : 'none' }}>
                {dateShort(p.date)}{p.synthetic && ' •'}
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-text3">
        <span>Min {czk(minP)}</span>
        <span>Max {czk(maxP)}</span>
      </div>
    </div>
  )
}
