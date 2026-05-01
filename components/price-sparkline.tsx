'use client'

// Miniaturní graf vývoje ceny — SVG, bez knihoven.
// Zobrazuje nejnižší dostupnou cenu ze všech prodejců za každý den.

interface PricePoint {
  date: string   // YYYY-MM-DD
  price: number
}

interface Props {
  data: PricePoint[]
  currentPrice: number | null
  currency?: string
}

function formatCzk(n: number) {
  return n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
}

export function PriceSparkline({ data, currentPrice, currency = 'CZK' }: Props) {
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

  const prices = data.map((d) => d.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const range = maxP - minP || 1

  const xs = data.map((_, i) => PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right))
  const ys = data.map((d) => PAD.top + ((maxP - d.price) / range) * (H - PAD.top - PAD.bottom))

  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ')

  // Fill area under line
  const fillPts = [
    `${xs[0]},${H - PAD.bottom}`,
    ...xs.map((x, i) => `${x},${ys[i]}`),
    `${xs[xs.length - 1]},${H - PAD.bottom}`,
  ].join(' ')

  const lastY = ys[ys.length - 1]
  const lastX = xs[xs.length - 1]

  // Trend arrow
  const firstPrice = data[0].price
  const lastPrice = data[data.length - 1].price
  const trend = lastPrice < firstPrice ? 'down' : lastPrice > firstPrice ? 'up' : 'flat'
  const trendColor = trend === 'down' ? '#2d6a4f' : trend === 'up' ? '#c4711a' : '#aeaeb2'
  const trendLabel = trend === 'down' ? '↓ Cena klesla' : trend === 'up' ? '↑ Cena vzrostla' : '→ Stabilní'

  const days = data.length
  const startDate = new Date(data[0].date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
  const endDate = new Date(data[data.length - 1].date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })

  return (
    <div className="mt-4 border-t border-off pt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-text2 tracking-wide">Vývoj ceny</span>
        <span className="text-[11px] text-text3">{startDate} – {endDate} ({days} dní)</span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: H }}
          aria-label="Graf vývoje ceny"
        >
          {/* Fill */}
          <polygon points={fillPts} fill="#2d6a4f" opacity="0.07" />
          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#2d6a4f"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Endpoint dot */}
          <circle cx={lastX} cy={lastY} r="3" fill="#2d6a4f" />
        </svg>

        {/* Min / max labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-text3">
            Min {formatCzk(minP)}
          </span>
          <span className="text-[10px]" style={{ color: trendColor }}>
            {trendLabel}
          </span>
          <span className="text-[10px] text-text3">
            Max {formatCzk(maxP)}
          </span>
        </div>
      </div>
    </div>
  )
}
