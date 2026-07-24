'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sparkles, Info } from 'lucide-react'

// Preset flavor profiles → flavor_labels mapping
const FLAVOR_CHIPS = [
  { label: 'Lehký a jemný',   labels: ['jemny'],           hint: 'Jemný, sametový profil bez výrazné hořkosti. Vhodný do salátů, na ryby, pro citlivou chuť.' },
  { label: 'Ovocný a svěží',  labels: ['ovocny'],          hint: 'Výrazné ovocné tóny — jablko, zelená rajčata, banán. Skvělý syrový na chleba a zeleninu.' },
  { label: 'Hořký a palčivý', labels: ['horky', 'palivy'], hint: 'Polyfenolový charakter — hořkost a štiplavost v hrdle. Znak kvality a zdraví.' },
  { label: 'Univerzál',       labels: [],                   hint: 'Žádný chuťový limit — ukazuje všechny oleje. Kombinuj s cenovou hranicí.' },
] as const

const PRICE_OPTIONS = [
  { label: 'Bez limitu', value: null },
  { label: 'Do 200 Kč', value: 200 },
  { label: 'Do 400 Kč', value: 400 },
  { label: 'Do 800 Kč', value: 800 },
]

interface Props {
  totalProducts: number
}

export function FlavorSelector({ totalProducts }: Props) {
  const [activeChipIndex, setActiveChipIndex] = useState<number | null>(null)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [totalWithLabels, setTotalWithLabels] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeChip = activeChipIndex != null ? FLAVOR_CHIPS[activeChipIndex] : null
  const activeLabels = activeChip?.labels ?? []

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/flavor-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labels: activeLabels, maxPrice }),
        })
        const data = (await res.json()) as { count: number; slugs: string[]; totalWithLabels: number }
        setCount(data.count)
        if (data.totalWithLabels) setTotalWithLabels(data.totalWithLabels)
      } catch {
        setCount(null)
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [activeChipIndex, maxPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build /srovnavac URL
  const params = new URLSearchParams()
  if (activeLabels.length > 0) params.set('flavor', activeLabels.join(','))
  if (maxPrice) params.set('maxPrice', String(maxPrice))
  const resultsHref = `/srovnavac${params.toString() ? '?' + params.toString() : ''}`

  const countWord = count === 1 ? 'olej' : count != null && count >= 2 && count <= 4 ? 'oleje' : 'olejů'

  return (
    <section className="py-10 px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="text-[12px] font-medium tracking-[0.05em] uppercase text-text2 mb-[6px]">
              — Nalaď podle chuti
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-[26px] font-medium text-text leading-[1.1]">
              Vyber chuť, <em className="italic text-olive-light">ne značku</em>.
            </h2>
          </div>
          <p className="text-[13px] text-text3 max-w-[420px] flex items-center gap-1.5">
            Porovnáváme podle chuťových štítků z popisů výrobců
            {totalWithLabels != null
              ? ` (${totalWithLabels} olejů se štítky z ${totalProducts} v katalogu)`
              : ` (${totalProducts} v katalogu)`}
            <span className="group relative inline-flex shrink-0">
              <Info size={13} className="text-text3/60 cursor-help" />
              <span
                role="tooltip"
                className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute right-0 top-full mt-1.5 z-50 w-60 bg-text text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-opacity"
              >
                Štítky přiřazujeme jen ze zdrojového popisu výrobce — nikdy nevymýšlíme ani nedomýšlíme chuťový profil. Olej bez popisu štítek nemá.
                <span className="absolute -top-1 right-3 w-2 h-2 bg-text rotate-45" />
              </span>
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          {/* Chips panel */}
          <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
            {/* Flavor chips */}
            <div className="mb-1.5">
              <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-3">Chuťový profil</div>
              <div className="flex flex-wrap gap-2">
                {FLAVOR_CHIPS.map((chip, i) => {
                  const isActive = activeChipIndex === i
                  return (
                    <span key={chip.label} className="group relative">
                      <button
                        onClick={() => setActiveChipIndex(isActive ? null : i)}
                        aria-pressed={isActive}
                        className={`text-[13px] font-medium rounded-full px-4 py-2 border transition-all ${
                          isActive
                            ? 'bg-olive text-white border-olive shadow-sm'
                            : 'bg-off text-text2 border-off2 hover:bg-olive-bg hover:text-olive hover:border-olive-border'
                        }`}
                      >
                        {chip.label}
                      </button>
                      {/* Tooltip */}
                      <span
                        role="tooltip"
                        className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-52 bg-text text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-opacity"
                      >
                        {chip.hint}
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-text rotate-45" />
                      </span>
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Divider + price chips */}
            <div className="mt-5 pt-4 border-t border-off flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-text3">Cena:</span>
              {PRICE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setMaxPrice(opt.value)}
                  aria-pressed={maxPrice === opt.value}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${
                    maxPrice === opt.value
                      ? 'bg-olive text-white border-olive'
                      : 'bg-white text-text2 border-off2 hover:border-olive-border'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Active state hint */}
            {(activeChipIndex != null || maxPrice != null) && (
              <div className="mt-3 text-[11px] text-text3 flex items-center gap-2">
                <span>
                  Filtruješ:{' '}
                  {activeChip ? <strong className="text-olive">{activeChip.label}</strong> : 'vše'}
                  {maxPrice ? <> · cena do {maxPrice} Kč</> : null}
                </span>
                <button
                  onClick={() => { setActiveChipIndex(null); setMaxPrice(null) }}
                  className="text-text3 hover:text-text underline underline-offset-2 transition-colors"
                >
                  Zrušit
                </button>
              </div>
            )}
          </div>

          {/* Live result card */}
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
                {activeChip ? `Štítek: ${activeChip.label.toLowerCase()}` : 'Všechny oleje'}
              </div>

              <div className="flex items-baseline gap-2.5 mb-1">
                <span className="font-[family-name:var(--font-display)] text-6xl font-normal leading-none tabular-nums">
                  {count ?? '—'}
                </span>
                <span className="text-[14px] text-white/75 font-light">{countWord}</span>
              </div>
              <div className="text-[12px] text-white/60 mb-4">
                {count === 0
                  ? 'zkus jiný štítek nebo cenu'
                  : `z ${totalProducts} v katalogu`}
              </div>

              {/* Selected label chips */}
              {activeLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {activeLabels.map((l) => (
                    <span key={l} className="text-[10px] bg-white/15 text-white/80 rounded-full px-2 py-0.5">
                      {l}
                    </span>
                  ))}
                </div>
              )}

              {count != null && count > 0 && (
                <Link
                  href={resultsHref}
                  className="block text-center bg-white text-olive-dark rounded-full px-4 py-2.5 text-[13px] font-semibold hover:bg-olive-bg transition-colors"
                >
                  Zobrazit {count === 1 ? 'olej' : count <= 4 ? `${count} oleje` : `všech ${count} olejů`} →
                </Link>
              )}
              {(count == null || count === 0) && (
                <Link
                  href="/srovnavac"
                  className="block text-center bg-white/20 text-white rounded-full px-4 py-2.5 text-[13px] font-medium hover:bg-white/30 transition-colors"
                >
                  Přejít do srovnávače →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
