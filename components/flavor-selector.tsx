'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

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
    <section className="py-10 px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1">
              — Nalaď podle chuti
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-[28px] font-normal text-text leading-tight">
              Vyber chuť, ne značku.
            </h2>
          </div>
          <p className="text-[13px] text-text3 max-w-[420px]">
            Algoritmus prochází chuťové profily všech {totalProducts} olejů a hledá shodu.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          {/* Sliders */}
          <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4 md:p-5">
            {/* Presets — chips inline */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.state)}
                    className="text-[11px] bg-off hover:bg-olive-bg hover:text-olive border border-off2 hover:border-olive-border rounded-full px-2.5 py-1 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders ve 2 sloupcích — kompaktnější */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              <Slider
                label="Ovocnost"
                value={state.fruity}
                onChange={(v) => update('fruity', v)}
                leftLabel="neutrální"
                rightLabel="ovocný"
                hint="Intenzita ovocných tónů — jablko, banán, zelená rajčata, tropické ovoce. Vyšší hodnota = výraznější aroma čerstvého ovoce."
              />
              <Slider
                label="Hořkost"
                value={state.bitter}
                onChange={(v) => update('bitter', v)}
                leftLabel="jemný"
                rightLabel="hořký"
                hint="Hořkost typická pro polyfenoly. Vysoká hořkost = více antioxidantů (zdravější) ale silnější chuť. Typické pro early-harvest oleje."
              />
              <Slider
                label="Palčivost"
                value={state.spicy}
                onChange={(v) => update('spicy', v)}
                leftLabel="hladký"
                rightLabel="palčivý"
                hint="Štiplavost v hrdle (oleocanthal polyfenol). Po polknutí olej zaštípe v krku. Znak vysoké kvality EVOO."
              />
              <Slider
                label="Krémovost"
                value={state.mild}
                onChange={(v) => update('mild', v)}
                leftLabel="výrazný"
                rightLabel="máslový"
                hint="Jemný, sametový profil bez výrazné hořkosti či palčivosti. Vhodné pro citlivou chuť, saláty, ryby."
              />
            </div>

            <div className="mt-4 pt-3 border-t border-off flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-text3">Cena:</span>
              {PRICE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => update('maxPrice', opt.value)}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${
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

          {/* Live result — vylepšená karta s mini chuťovým profilem */}
          <div className="bg-olive-dark rounded-[var(--radius-card)] p-5 text-white flex flex-col justify-center relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-12 -right-12 w-40 h-40 bg-olive-light/30 rounded-full blur-3xl pointer-events-none"
            />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles size={11} strokeWidth={1.75} className="text-white/70" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/70">
                  {loading ? 'Hledám…' : 'Pro tvou chuť'}
                </span>
              </div>

              <div className="font-[family-name:var(--font-display)] italic text-[15px] text-white/80 leading-snug mb-1.5">
                Tvému výběru odpovídá:
              </div>

              <div className="flex items-baseline gap-2.5 mb-1">
                <span className="font-[family-name:var(--font-display)] text-6xl font-normal leading-none tabular-nums">
                  {count ?? '—'}
                </span>
                <span className="text-[14px] text-white/75 font-light">
                  {count === 1 ? 'olej' : count != null && count >= 2 && count <= 4 ? 'oleje' : 'olejů'}
                </span>
              </div>
              <div className="text-[12px] text-white/60 mb-4">
                {count === 0 ? 'uvolni jezdce — zkus širší rozpětí' : `z ${totalProducts} v katalogu`}
              </div>

              <div className="flex gap-1.5 mb-4">
                {[
                  { label: 'Ovocný', value: state.fruity },
                  { label: 'Hořký', value: state.bitter },
                  { label: 'Palčivý', value: state.spicy },
                  { label: 'Jemný', value: state.mild },
                ].map((p) => (
                  <div key={p.label} className="flex-1 min-w-0">
                    <div className="h-1 bg-white/15 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/70 rounded-full transition-all duration-300"
                        style={{ width: `${p.value}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-white/55 mt-1 truncate">{p.label}</div>
                  </div>
                ))}
              </div>

              {count != null && count > 0 && (
                <Link
                  href={resultsHref}
                  className="block text-center bg-white text-olive-dark rounded-full px-4 py-2.5 text-[13px] font-semibold hover:bg-olive-bg transition-colors"
                >
                  Zobrazit {count === 1 ? 'olej' : count <= 4 ? `${count} oleje` : `všech ${count} olejů`} →
                </Link>
              )}
            </div>
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
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  leftLabel: string
  rightLabel: string
  hint?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-medium text-text">{label}</span>
          {hint && (
            <span className="group relative inline-flex">
              {/* "?" ikonka — pure CSS hover tooltip, žádný JS */}
              <span
                tabIndex={0}
                aria-label={`Vysvětlivka: ${label}`}
                className="w-4 h-4 inline-flex items-center justify-center bg-off2 text-text3 hover:bg-olive-bg hover:text-olive rounded-full text-[10px] font-bold cursor-help transition-colors"
              >
                ?
              </span>
              {/* Tooltip popup — zobrazí se při hover/focus */}
              <span
                role="tooltip"
                className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-56 bg-text text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-opacity"
              >
                {hint}
                {/* Šipka nahoru */}
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-text rotate-45" />
              </span>
            </span>
          )}
        </div>
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
