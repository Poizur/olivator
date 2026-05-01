'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { ListCard } from '@/components/list-card'
import { FilterPanel, type FilterCounts } from '@/components/filter-panel'
import { countryName, certLabel, formatPrice } from '@/lib/utils'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

const PRICE_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Bez limitu', value: null },
  { label: 'Do 200 Kč', value: 200 },
  { label: 'Do 400 Kč', value: 400 },
  { label: 'Do 800 Kč', value: 800 },
]

const TYPE_LABELS: Record<string, string> = {
  evoo: 'Extra panenský',
  virgin: 'Panenský',
  refined: 'Rafinovaný',
  olive_oil: 'Olivový olej',
  pomace: 'Pokrutinový',
}

export function ListingContent({
  products,
  counts,
}: {
  products: ProductWithOffer[]
  counts: FilterCounts
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeTypes = searchParams.get('type')?.split(',').filter(Boolean) || []
  const activeOrigins = searchParams.get('origin')?.split(',').filter(Boolean) || []
  const activeCerts = searchParams.get('cert')?.split(',').filter(Boolean) || []
  const activeQuality = searchParams.get('quality')?.split(',').filter(Boolean) || []
  const sort = searchParams.get('sort') || 'score'
  const maxPrice = searchParams.get('maxPrice')
  const search = searchParams.get('q') || ''

  // Local search state — debounced into URL pro performance
  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchInput.trim()) params.set('q', searchInput.trim())
      else params.delete('q')
      const next = params.toString()
      if (next !== searchParams.toString()) {
        router.replace(`/srovnavac${next ? '?' + next : ''}`)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [searchInput, searchParams, router])

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/srovnavac?${params.toString()}`)
  }

  function clearFilter(key: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && params.get(key)) {
      const arr = params.get(key)!.split(',').filter((v) => v !== value)
      if (arr.length > 0) params.set(key, arr.join(','))
      else params.delete(key)
    } else {
      params.delete(key)
    }
    router.push(`/srovnavac?${params.toString()}`)
  }

  function clearAll() {
    setSearchInput('')
    router.push('/srovnavac')
  }

  const filtered = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameShort ?? '').toLowerCase().includes(q) ||
        (p.originRegion ?? '').toLowerCase().includes(q)
      )
    }
    if (activeTypes.length > 0) {
      list = list.filter((p) => activeTypes.includes(p.type))
    }
    if (activeOrigins.length > 0) {
      list = list.filter((p) => activeOrigins.includes(p.originCountry))
    }
    if (activeCerts.length > 0) {
      list = list.filter((p) => activeCerts.some((c) => p.certifications.includes(c)))
    }
    if (activeQuality.includes('high_polyphenols')) {
      list = list.filter((p) => p.polyphenols != null && p.polyphenols >= 500)
    }
    if (activeQuality.includes('high_oleocanthal')) {
      list = list.filter((p) => p.oleocanthal != null && p.oleocanthal >= 100)
    }
    if (maxPrice) {
      const max = Number(maxPrice)
      if (!isNaN(max)) {
        list = list.filter((p) => p.cheapestOffer != null && p.cheapestOffer.price <= max)
      }
    }

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => (a.cheapestOffer?.price ?? 9999) - (b.cheapestOffer?.price ?? 9999))
        break
      case 'price_desc':
        list.sort((a, b) => (b.cheapestOffer?.price ?? 0) - (a.cheapestOffer?.price ?? 0))
        break
      case 'acidity':
        list.sort((a, b) => (a.acidity ?? 999) - (b.acidity ?? 999))
        break
      case 'polyphenols':
        list.sort((a, b) => (b.polyphenols ?? 0) - (a.polyphenols ?? 0))
        break
      default:
        list.sort((a, b) => b.olivatorScore - a.olivatorScore)
    }

    return list
  }, [products, search, activeTypes, activeOrigins, activeCerts, activeQuality, sort, maxPrice])

  const hasActiveFilters =
    activeTypes.length > 0 ||
    activeOrigins.length > 0 ||
    activeCerts.length > 0 ||
    activeQuality.length > 0 ||
    !!maxPrice ||
    !!search.trim()

  return (
    <div className="px-6 md:px-10 py-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-1.5">
            Srovnávač olivových olejů
          </h1>
          <p className="text-[14px] text-text2 font-light">
            {filtered.length} produktů · aktualizováno dnes
          </p>
        </div>

        {/* Search + sort + price row */}
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-3 mb-4 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text3"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Hledat olej…"
              className="w-full pl-9 pr-3 py-2 text-[13px] text-text bg-off rounded-md outline-none focus:bg-white focus:ring-1 focus:ring-olive transition-all"
            />
          </div>

          {/* Price quick filter */}
          <div className="flex gap-1 flex-wrap">
            {PRICE_OPTIONS.map((opt) => {
              const active =
                opt.value === null ? !maxPrice : maxPrice === String(opt.value)
              return (
                <button
                  key={opt.label}
                  onClick={() => updateParam('maxPrice', opt.value ? String(opt.value) : null)}
                  className={`text-[12px] rounded-md px-2.5 py-1.5 border transition-colors ${
                    active
                      ? 'bg-olive text-white border-olive'
                      : 'bg-white text-text2 border-off2 hover:border-olive-border'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Sort */}
          <select
            className="bg-off border border-off2 rounded-md px-2.5 py-1.5 text-[13px] text-text cursor-pointer hover:border-olive-border"
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value === 'score' ? null : e.target.value)}
          >
            <option value="score">Řadit: Score ↓</option>
            <option value="price_asc">Cena ↑</option>
            <option value="price_desc">Cena ↓</option>
            <option value="acidity">Kyselost ↑</option>
            <option value="polyphenols">Polyfenoly ↓</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-start">
          <FilterPanel counts={counts} />

          <div>
            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1.5 mb-4 items-center">
                <span className="text-[11px] text-text3 uppercase tracking-wider font-medium mr-1">
                  Filtr:
                </span>
                {search.trim() && (
                  <FilterChip
                    label={`"${search.trim()}"`}
                    onRemove={() => {
                      setSearchInput('')
                    }}
                  />
                )}
                {activeTypes.map((t) => (
                  <FilterChip
                    key={`t-${t}`}
                    label={TYPE_LABELS[t] ?? t}
                    onRemove={() => clearFilter('type', t)}
                  />
                ))}
                {activeOrigins.map((c) => (
                  <FilterChip
                    key={`o-${c}`}
                    label={countryName(c)}
                    onRemove={() => clearFilter('origin', c)}
                  />
                ))}
                {activeCerts.map((c) => (
                  <FilterChip
                    key={`c-${c}`}
                    label={certLabel(c)}
                    onRemove={() => clearFilter('cert', c)}
                  />
                ))}
                {activeQuality.includes('high_polyphenols') && (
                  <FilterChip
                    label="Polyfenoly ≥500"
                    onRemove={() => clearFilter('quality', 'high_polyphenols')}
                  />
                )}
                {activeQuality.includes('high_oleocanthal') && (
                  <FilterChip
                    label="Oleokantal ≥100"
                    onRemove={() => clearFilter('quality', 'high_oleocanthal')}
                  />
                )}
                {maxPrice && (
                  <FilterChip
                    label={`Do ${formatPrice(Number(maxPrice))}`}
                    onRemove={() => clearFilter('maxPrice')}
                  />
                )}
                <button
                  onClick={clearAll}
                  className="text-[12px] text-text3 hover:text-text underline ml-2"
                >
                  Vymazat vše
                </button>
              </div>
            )}

            <div className="text-[13px] text-text3 mb-3">
              <strong className="text-text">{filtered.length}</strong> {filtered.length === 1 ? 'výsledek' : filtered.length < 5 ? 'výsledky' : 'výsledků'}
            </div>

            <div className="flex flex-col gap-3">
              {filtered.map((p, i) => (
                <ListCard
                  key={p.id}
                  product={p}
                  offer={p.cheapestOffer ?? undefined}
                  rank={i + 1}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20 bg-white border border-off2 rounded-[var(--radius-card)]">
                <div className="text-[15px] text-text2 mb-3">
                  Žádné oleje neodpovídají vybraným filtrům.
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="text-[13px] text-olive border border-olive-border rounded-full px-4 py-1.5 hover:bg-olive-bg"
                  >
                    Vymazat všechny filtry
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1 text-[12px] bg-olive-bg border border-olive-border text-olive-dark rounded-full px-2.5 py-1 hover:bg-olive4 transition-colors"
      aria-label={`Odstranit filtr ${label}`}
    >
      <span>{label}</span>
      <span className="text-text3 font-bold">×</span>
    </button>
  )
}
