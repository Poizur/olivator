'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface FlavorState {
  fruity: number
  bitter: number
  spicy: number
  mild: number
  maxPrice: number | null
}

const PRESETS: Array<{ label: string; state: FlavorState }> = [
  {
    label: 'Lehký a jemný',
    state: { fruity: 60, bitter: 20, spicy: 20, mild: 75, maxPrice: null },
  },
  {
    label: 'Ovocný a svěží',
    state: { fruity: 80, bitter: 35, spicy: 30, mild: 50, maxPrice: null },
  },
  {
    label: 'Hořký a palčivý',
    state: { fruity: 50, bitter: 75, spicy: 70, mild: 25, maxPrice: null },
  },
  {
    label: 'Univerzál do vaření',
    state: { fruity: 50, bitter: 40, spicy: 35, mild: 60, maxPrice: 350 },
  },
]

const PRICE_OPTIONS = [
  { label: 'Bez limitu', value: null },
  { label: 'Do 200 Kč', value: 200 },
  { label: 'Do 400 Kč', value: 400 },
  { label: 'Do 800 Kč', value: 800 },
]

export function FlavorSelector({ totalProducts }: { totalProducts: number }) {
  const [state, setState] = useState<FlavorState>({
    fruity: 60,
    bitter: 40,
    spicy: 35,
    mild: 55,
    maxPrice: null,
  })
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/flavor-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        })
        const data = (await res.json()) as { count: number; slugs: string[] }
        setCount(data.count)
      } catch {
        setCount(null)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [state])

  function update<K extends keyof FlavorState>(key: K, value: FlavorState[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  function applyPreset(preset: FlavorState) {
    setState(preset)
  }

  // Build URL params for /srovnavac with flavor filters
  const params = new URLSearchParams()
  params.set('fruity', String(state.fruity))
  params.set('bitter', String(state.bitter))
  params.set('spicy', String(state.spicy))
  params.set('mild', String(state.mild))
  if (state.maxPrice) params.set('max', String(state.maxPrice))
  const resultsHref = `/srovnavac?${params.toString()}`

  return (
    <section className="bg-off/40 border-y border-off2 py-16 px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-10">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
            — Nalaď podle chuti
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text mb-3">
            Vyber chuť, ne značku.
          </h2>
          <p className="text-[15px] text-text2 max-w-[520px] mx-auto">
            Posuň jezdce podle toho, co máš rád. Náš algoritmus prochází chuťové profily všech {totalProducts} olejů a hledá shodu.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Sliders */}
          <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 md:p-8">
            {/* Presets */}
            <div className="mb-6">
              <div className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-2">Rychlá volba</div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.state)}
                    className="text-[12px] bg-off hover:bg-olive-bg hover:text-olive border border-off2 hover:border-olive-border rounded-full px-3 py-1.5 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <Slider label="Ovocnost" value={state.fruity} onChange={(v) => update('fruity', v)} leftLabel="neutrální" rightLabel="ovocný" />
              <Slider label="Hořkost" value={state.bitter} onChange={(v) => update('bitter', v)} leftLabel="jemný" rightLabel="hořký" />
              <Slider label="Palčivost" value={state.spicy} onChange={(v) => update('spicy', v)} leftLabel="hladký" rightLabel="palčivý" />
              <Slider label="Krémovost" value={state.mild} onChange={(v) => update('mild', v)} leftLabel="výrazný" rightLabel="máslový" />
            </div>

            <div className="mt-6 pt-5 border-t border-off">
              <div className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-2">Cena</div>
              <div className="flex flex-wrap gap-2">
                {PRICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => update('maxPrice', opt.value)}
                    className={`text-[12px] rounded-full px-3 py-1.5 border transition-colors ${
                      state.maxPrice === opt.value
                        ? 'bg-olive text-white border-olive'
                        : 'bg-white text-text2 border-off2 hover:border-olive-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live result */}
          <div className="bg-olive-dark rounded-[var(--radius-card)] p-8 text-white flex flex-col justify-center">
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/70 mb-3">
              {loading ? 'Hledám…' : 'Tvému profilu odpovídá'}
            </div>
            <div className="font-[family-name:var(--font-display)] text-7xl font-normal leading-none mb-2 tabular-nums">
              {count ?? '—'}
            </div>
            <div className="text-[15px] text-white/80 mb-6">
              {count === 0
                ? 'olejů — zkus jezdce uvolnit'
                : count === 1
                  ? 'olej s tvojí chutí'
                  : 'olejů s tvojí chutí'}
            </div>

            {count != null && count > 0 && (
              <Link
                href={resultsHref}
                className="block text-center bg-white text-olive-dark rounded-full px-5 py-3 text-[14px] font-semibold hover:bg-olive-bg transition-colors"
              >
                Zobrazit {count === 1 ? 'olej' : `všech ${count}`} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Slider({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  leftLabel: string
  rightLabel: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[14px] font-medium text-text">{label}</div>
        <div className="text-[12px] text-text3 tabular-nums">{value}/100</div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-olive cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-text3 mt-0.5">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}
