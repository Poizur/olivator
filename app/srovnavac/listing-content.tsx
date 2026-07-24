'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { FilterPanel, type FilterCounts } from '@/components/filter-panel'
import { LeadMagnetCta } from '@/components/lead-magnet-cta'
import { TopProductCard } from '@/components/home/top-product-card'
import { countryName, certLabel, formatPrice } from '@/lib/utils'
import { classifyIntensity, INTENSITY_LABELS, type Intensity } from '@/lib/intensity-classifier'
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

const PAGE_SIZE = 30

const FLAVOR_CHIPS = [
  { key: 'jemny',   label: 'Jemný' },
  { key: 'ovocny',  label: 'Ovocný' },
  { key: 'bylinny', label: 'Bylinný' },
  { key: 'horky',   label: 'Hořký' },
  { key: 'palivy',  label: 'Pálivý' },
  { key: 'vyrazny', label: 'Výrazný' },
]

const FLAVOR_LABEL_CZ: Record<string, string> = {
  jemny: 'Jemný', ovocny: 'Ovocný', bylinny: 'Bylinný',
  horky: 'Hořký', palivy: 'Pálivý', vyrazny: 'Výrazný',
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

  // ── URL params ──────────────────────────────────────────────────────────────
  const activeTypes = searchParams.get('type')?.split(',').filter(Boolean) || []
  const activeOrigins = searchParams.get('origin')?.split(',').filter(Boolean) || []
  const activeCerts = searchParams.get('cert')?.split(',').filter(Boolean) || []
  const activeQuality = searchParams.get('quality')?.split(',').filter(Boolean) || []
  const activeIntensity = searchParams.get('intensity') as Intensity | null
  const sort = searchParams.get('sort') || 'score'
  const maxPrice = searchParams.get('maxPrice')
  const volume = searchParams.get('volume')
  const search = searchParams.get('q') || ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))

  // ── Search (local → debounced URL) ──────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchInput.trim()) params.set('q', searchInput.trim())
      else params.delete('q')
      params.delete('page')
      const next = params.toString()
      if (next !== searchParams.toString()) {
        router.replace(`/srovnavac${next ? '?' + next : ''}`)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Flavor chip filter (URL param: ?flavor=jemny,ovocny) ──────────────────────
  const activeFlavorLabels = searchParams.get('flavor')?.split(',').filter(Boolean) ?? []
  const [flavorOpen, setFlavorOpen] = useState(() => activeFlavorLabels.length > 0)

  function toggleFlavorLabel(label: string) {
    const params = new URLSearchParams(searchParams.toString())
    const current = params.get('flavor')?.split(',').filter(Boolean) ?? []
    const next = current.includes(label)
      ? current.filter((l) => l !== label)
      : [...current, label]
    if (next.length > 0) params.set('flavor', next.join(','))
    else params.delete('flavor')
    params.delete('page')
    router.push(`/srovnavac${params.toString() ? '?' + params.toString() : ''}`)
  }

  function closeFlavor() {
    setFlavorOpen(false)
  }

  // ── Param helpers ────────────────────────────────────────────────────────────
  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
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
    params.delete('page')
    router.push(`/srovnavac?${params.toString()}`)
  }

  function clearAll() {
    setSearchInput('')
    setFlavorOpen(false)
    router.push('/srovnavac')
  }

  // ── Filtering + sorting ──────────────────────────────────────────────────────
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
    if (activeTypes.length > 0) list = list.filter((p) => activeTypes.includes(p.type))
    if (activeOrigins.length > 0) list = list.filter((p) => activeOrigins.includes(p.originCountry))
    if (activeCerts.length > 0) list = list.filter((p) => activeCerts.some((c) => p.certifications.includes(c)))
    if (activeQuality.includes('high_polyphenols')) list = list.filter((p) => p.polyphenols != null && p.polyphenols >= 250)
    if (activeQuality.includes('high_oleocanthal')) list = list.filter((p) => p.oleocanthal != null && p.oleocanthal >= 100)
    if (activeIntensity) list = list.filter((p) => classifyIntensity(p) === activeIntensity)
    if (volume === '5l') list = list.filter((p) => p.volumeMl != null && p.volumeMl >= 4500 && p.volumeMl <= 5500)
    if (maxPrice) {
      const max = Number(maxPrice)
      if (!isNaN(max)) list = list.filter((p) => p.cheapestOffer != null && p.cheapestOffer.price <= max)
    }

    // Flavor label filter — AND: produkt musí mít VŠECHNY vybrané štítky
    if (activeFlavorLabels.length > 0) {
      list = list.filter((p) =>
        activeFlavorLabels.every((l) => p.flavorLabels.includes(l))
      )
    }

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => (a.cheapestOffer?.price ?? 9999) - (b.cheapestOffer?.price ?? 9999))
        break
      case 'price_desc':
        list.sort((a, b) => (b.cheapestOffer?.price ?? 0) - (a.cheapestOffer?.price ?? 0))
        break
      case 'price_per_100ml':
        list.sort((a, b) => {
          const ppa = a.cheapestOffer ? a.cheapestOffer.price / Math.max(1, a.volumeMl ?? 500) : 9999
          const ppb = b.cheapestOffer ? b.cheapestOffer.price / Math.max(1, b.volumeMl ?? 500) : 9999
          return ppa - ppb
        })
        break
      case 'acidity':
        list.sort((a, b) => (a.acidity ?? 999) - (b.acidity ?? 999))
        break
      case 'polyphenols':
        list.sort((a, b) => (b.polyphenols ?? 0) - (a.polyphenols ?? 0))
        break
      default:
        list.sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))
    }
    return list
  }, [products, search, activeTypes, activeOrigins, activeCerts, activeQuality, activeIntensity, sort, maxPrice, volume, activeFlavorLabels])

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const hasActiveFilters =
    activeTypes.length > 0 || activeOrigins.length > 0 || activeCerts.length > 0 ||
    activeQuality.length > 0 || !!activeIntensity || !!maxPrice || !!search.trim() ||
    activeFlavorLabels.length > 0 || volume === '5l'

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-4">
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text mb-1">
            Katalog olivových olejů
          </h1>
          <p className="text-[13px] text-text2 font-light">
            {filtered.length} produktů · aktualizováno dnes
          </p>
        </div>

        {/* ── Toolbar: search + flavor toggle + price + sort ── */}
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-3 mb-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text3">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Hledat olej…"
              className="w-full pl-9 pr-3 py-2 text-[13px] text-text bg-off rounded-md outline-none focus:bg-white focus:ring-1 focus:ring-olive transition-all"
            />
          </div>

          {/* Chuťový profil toggle */}
          <button
            onClick={() => setFlavorOpen((o) => !o)}
            className={`text-[12px] rounded-md px-2.5 py-[7px] border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              flavorOpen || activeFlavorLabels.length > 0
                ? 'bg-olive text-white border-olive'
                : 'bg-white text-text2 border-off2 hover:border-olive-border'
            }`}
          >
            <span>🎛</span> Chuťový profil
            {activeFlavorLabels.length > 0 && <span className="text-white/80 text-[10px]">({activeFlavorLabels.length})</span>}
          </button>

          {/* Price quick filter */}
          <div className="flex gap-1 flex-wrap">
            {PRICE_OPTIONS.map((opt) => {
              const active = opt.value === null ? !maxPrice : maxPrice === String(opt.value)
              return (
                <button
                  key={opt.label}
                  onClick={() => updateParam('maxPrice', opt.value ? String(opt.value) : null)}
                  className={`text-[12px] rounded-md px-2.5 py-1.5 border transition-colors ${
                    active ? 'bg-olive text-white border-olive' : 'bg-white text-text2 border-off2 hover:border-olive-border'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Balení: 5L toggle */}
          <button
            onClick={() => updateParam('volume', volume === '5l' ? null : '5l')}
            className={`text-[12px] rounded-md px-2.5 py-1.5 border transition-colors whitespace-nowrap ${
              volume === '5l'
                ? 'bg-olive text-white border-olive'
                : 'bg-white text-text2 border-off2 hover:border-olive-border'
            }`}
          >
            📦 5L balení
          </button>

          {/* Sort */}
          <div className="flex gap-1 flex-wrap">
            {[
              { label: 'Score ↓', value: 'score' },
              { label: 'Cena ↑', value: 'price_asc' },
              { label: 'Cena/100ml', value: 'price_per_100ml' },
              { label: 'Polyfenoly', value: 'polyphenols' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateParam('sort', opt.value === 'score' ? null : opt.value)}
                className={`text-[12px] rounded-md px-2.5 py-1.5 border transition-colors whitespace-nowrap ${
                  sort === opt.value || (opt.value === 'score' && !searchParams.get('sort'))
                    ? 'bg-olive text-white border-olive'
                    : 'bg-white text-text2 border-off2 hover:border-olive-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chuťový profil panel ── */}
        {flavorOpen && (
          <div className="bg-white border border-olive-border rounded-[var(--radius-card)] p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-0.5">
                  — Nalaď podle chuti
                </div>
                <h2 className="text-[15px] font-medium text-text leading-tight">
                  Vyber chuť, ne značku
                </h2>
                <p className="text-[11px] text-text3 mt-0.5">
                  Porovnáváme podle chuťových štítků z popisů výrobců.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text3">
                  Vyhovuje: <strong className="text-olive">{filtered.length}</strong> olejů
                </span>
                <button
                  onClick={closeFlavor}
                  className="text-text3 hover:text-text text-xl leading-none px-1"
                  aria-label="Zavřít chuťový filtr"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {FLAVOR_CHIPS.map(({ key, label }) => {
                const active = activeFlavorLabels.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleFlavorLabel(key)}
                    className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? 'bg-olive text-white border-olive'
                        : 'bg-white text-text2 border-off2 hover:border-olive/40 hover:text-olive'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Hlavní obsah: filtr + produkty ── */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-start">
          <FilterPanel counts={counts} />

          <div>
            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1.5 mb-4 items-center">
                <span className="text-[11px] text-text3 uppercase tracking-wider font-medium mr-1">Filtr:</span>
                {search.trim() && (
                  <FilterChip label={`"${search.trim()}"`} onRemove={() => setSearchInput('')} />
                )}
                {activeFlavorLabels.map((l) => (
                  <FilterChip key={`fl-${l}`} label={`Chuť: ${FLAVOR_LABEL_CZ[l] ?? l}`} onRemove={() => toggleFlavorLabel(l)} />
                ))}
                {activeTypes.map((t) => (
                  <FilterChip key={`t-${t}`} label={TYPE_LABELS[t] ?? t} onRemove={() => clearFilter('type', t)} />
                ))}
                {activeOrigins.map((c) => (
                  <FilterChip key={`o-${c}`} label={countryName(c)} onRemove={() => clearFilter('origin', c)} />
                ))}
                {activeCerts.map((c) => (
                  <FilterChip key={`c-${c}`} label={certLabel(c)} onRemove={() => clearFilter('cert', c)} />
                ))}
                {activeQuality.includes('high_polyphenols') && (
                  <FilterChip label="Polyfenoly ≥500" onRemove={() => clearFilter('quality', 'high_polyphenols')} />
                )}
                {activeQuality.includes('high_oleocanthal') && (
                  <FilterChip label="Oleokantal ≥100" onRemove={() => clearFilter('quality', 'high_oleocanthal')} />
                )}
                {activeIntensity && (
                  <FilterChip
                    label={`Intenzita: ${INTENSITY_LABELS[activeIntensity]}`}
                    onRemove={() => clearFilter('intensity')}
                  />
                )}
                {maxPrice && (
                  <FilterChip label={`Do ${formatPrice(Number(maxPrice))}`} onRemove={() => clearFilter('maxPrice')} />
                )}
                {volume === '5l' && (
                  <FilterChip label="5L balení" onRemove={() => clearFilter('volume')} />
                )}
                <button onClick={clearAll} className="text-[12px] text-text3 hover:text-text underline ml-2">
                  Vymazat vše
                </button>
              </div>
            )}

            {/* Počet výsledků */}
            <div className="text-[13px] text-text3 mb-3">
              <strong className="text-text">{filtered.length}</strong>{' '}
              {filtered.length === 1 ? 'výsledek' : filtered.length < 5 ? 'výsledky' : 'výsledků'}
              {totalPages > 1 && (
                <span className="ml-2 text-text3">· strana {safePage}/{totalPages}</span>
              )}
            </div>

            {/* Produkt grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-3">
              {paginated.map((p, i) => (
                <TopProductCard
                  key={p.id}
                  product={p}
                  rank={(safePage - 1) * PAGE_SIZE + i + 1}
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1280px) 20vw, 200px"
                />
              ))}
            </div>

            {/* Empty state */}
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

            {/* Lead magnet CTA — zobrazit jen na první stránce bez aktivních filtrů */}
            {safePage === 1 && !hasActiveFilters && filtered.length > 0 && (
              <div className="mt-6">
                <LeadMagnetCta variant="sidebar" source="leadmagnet_srovnavac" />
              </div>
            )}

            {/* Stránkování */}
            {totalPages > 1 && filtered.length > 0 && (
              <Pagination page={safePage} totalPages={totalPages} searchParams={searchParams} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-komponenty ─────────────────────────────────────────────────────────────


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

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number
  totalPages: number
  searchParams: ReturnType<typeof useSearchParams>
}) {
  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (p <= 1) params.delete('page')
    else params.set('page', String(p))
    const qs = params.toString()
    return `/srovnavac${qs ? '?' + qs : ''}`
  }

  // Rozsah stránek s ellipsis
  const range: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) range.push(i)
  } else {
    range.push(1)
    if (page > 3) range.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i)
    if (page < totalPages - 2) range.push('...')
    range.push(totalPages)
  }

  const base = 'inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg text-[13px] border transition-colors'
  const active = `${base} bg-olive text-white border-olive font-medium`
  const normal = `${base} border-off2 text-text2 hover:border-olive-mid hover:text-olive bg-white`
  const disabled = `${base} border-off2 text-text3 opacity-40 pointer-events-none bg-white`

  return (
    <nav aria-label="Stránkování" className="flex items-center justify-center gap-1 mt-8 pt-6 border-t border-off">
      <Link
        href={pageUrl(page - 1)}
        className={page <= 1 ? disabled : normal}
        aria-disabled={page <= 1}
        aria-label="Předchozí strana"
      >
        ←
      </Link>

      {range.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-1 text-[13px] text-text3 select-none">…</span>
        ) : (
          <Link key={p} href={pageUrl(p)} className={page === p ? active : normal} aria-current={page === p ? 'page' : undefined}>
            {p}
          </Link>
        )
      )}

      <Link
        href={pageUrl(page + 1)}
        className={page >= totalPages ? disabled : normal}
        aria-disabled={page >= totalPages}
        aria-label="Další strana"
      >
        →
      </Link>
    </nav>
  )
}
