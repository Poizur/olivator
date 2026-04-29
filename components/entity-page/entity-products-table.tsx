'use client'

// Blok 4: Tabulka olejů — sortable + filterable client-side.
// Brief.md: žádné API volání, data hydratovaná SSR.
// Mobil: skryjeme kyselost a polyfenoly do expandable row.

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { ProductTableRow, EntityType } from './types'

interface FilterChip {
  key: string         // hodnota pro filter (slug nebo type)
  label: string       // co se zobrazí
  count: number
}

type SortKey = 'name' | 'score' | 'acidity' | 'polyphenols' | 'price'
type SortDir = 'asc' | 'desc'

interface Props {
  products: ProductTableRow[]
  entityType: EntityType
  /** Pre-vypočítané filtry. Klíč = co se filtruje, např. cultivar slug nebo type. */
  filters?: FilterChip[]
  /** Které pole produktu se filtruje proti chip.key. */
  filterField?: 'cultivarLabel' | 'cultivarSlugs' | 'type' | 'regionSlug' | 'originCountry'
}

function scorePillClass(score: number | null): string {
  if (score == null) return 'bg-off text-text3'
  if (score >= 60) return 'bg-olive-bg text-olive-dark'
  if (score >= 45) return 'bg-amber-50 text-amber-700'
  return 'bg-off2 text-text2'
}

function formatPrice(price: number | null): string {
  if (price == null) return '—'
  return `${Math.round(price).toLocaleString('cs-CZ')} Kč`
}

export function EntityProductsTable({ products, entityType, filters = [], filterField }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (activeFilter === 'all' || !filterField) return products
    return products.filter((p) => {
      // Array fields (cultivarSlugs) — exact match v poli
      if (filterField === 'cultivarSlugs') {
        return Array.isArray(p.cultivarSlugs) && p.cultivarSlugs.includes(activeFilter)
      }
      // String label (legacy) — case-insensitive substring
      if (filterField === 'cultivarLabel' && typeof p.cultivarLabel === 'string') {
        return p.cultivarLabel.toLowerCase().includes(activeFilter.toLowerCase())
      }
      // Ostatní (type, regionSlug, originCountry) — přesná shoda
      const v = p[filterField as keyof ProductTableRow]
      return v === activeFilter
    })
  }, [products, activeFilter, filterField])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const av = sortKey === 'score' ? a.olivatorScore :
                 sortKey === 'acidity' ? a.acidity :
                 sortKey === 'polyphenols' ? a.polyphenols :
                 sortKey === 'price' ? a.price : null
      const bv = sortKey === 'score' ? b.olivatorScore :
                 sortKey === 'acidity' ? b.acidity :
                 sortKey === 'polyphenols' ? b.polyphenols :
                 sortKey === 'price' ? b.price : null

      if (sortKey === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      // null hodnoty vždy na konec
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) return <span className="text-text3 text-[10px]">↕</span>
    return <span className="text-olive text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  if (products.length === 0) {
    return (
      <section className="px-6 md:px-10">
        <div className="max-w-[1280px] mx-auto bg-white border border-off2 rounded-[var(--radius-card)] p-12 text-center">
          <p className="text-text3">Žádné aktivní produkty.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        {/* Filtry */}
        {filters.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                activeFilter === 'all'
                  ? 'bg-olive text-white border-olive'
                  : 'bg-white text-text2 border-off2 hover:border-olive-light'
              }`}
            >
              Vše {products.length}
            </button>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                  activeFilter === f.key
                    ? 'bg-olive text-white border-olive'
                    : 'bg-white text-text2 border-off2 hover:border-olive-light'
                }`}
              >
                {f.label} <span className="opacity-60 ml-0.5">{f.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tabulka — desktop */}
        <div className="hidden md:block bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
          <table className="w-full" role="table">
            <thead>
              <tr className="bg-off border-b border-off2 text-left">
                <th
                  scope="col"
                  className="text-[11px] font-medium text-text2 uppercase tracking-wider px-4 py-3 cursor-pointer select-none"
                  onClick={() => onSort('name')}
                  aria-sort={sortKey === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Olej {sortIcon('name')}
                </th>
                <th
                  scope="col"
                  className="text-[11px] font-medium text-text2 uppercase tracking-wider px-4 py-3 cursor-pointer select-none w-24"
                  onClick={() => onSort('score')}
                  aria-sort={sortKey === 'score' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Skóre {sortIcon('score')}
                </th>
                <th
                  scope="col"
                  className="text-[11px] font-medium text-text2 uppercase tracking-wider px-4 py-3 cursor-pointer select-none w-28"
                  onClick={() => onSort('acidity')}
                  aria-sort={sortKey === 'acidity' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Kyselost {sortIcon('acidity')}
                </th>
                <th
                  scope="col"
                  className="text-[11px] font-medium text-text2 uppercase tracking-wider px-4 py-3 cursor-pointer select-none w-32"
                  onClick={() => onSort('polyphenols')}
                  aria-sort={sortKey === 'polyphenols' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Polyfenoly {sortIcon('polyphenols')}
                </th>
                <th
                  scope="col"
                  className="text-[11px] font-medium text-text2 uppercase tracking-wider px-4 py-3 cursor-pointer select-none w-28"
                  onClick={() => onSort('price')}
                  aria-sort={sortKey === 'price' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Cena {sortIcon('price')}
                </th>
                <th scope="col" className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.slug} className="border-b border-off last:border-b-0 hover:bg-off/50">
                  <td className="px-4 py-3">
                    <Link href={`/olej/${p.slug}`} className="flex items-center gap-4 group">
                      {/* Náhled lahve — větší (obrázky prodávají) */}
                      <div className="w-16 h-20 shrink-0 bg-off rounded-lg overflow-hidden flex items-center justify-center">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[28px] opacity-30">🫒</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-text leading-tight group-hover:text-olive transition-colors line-clamp-2">
                          {p.name}
                        </div>
                        {p.cultivarLabel && (
                          <div className="text-[11px] text-text3 mt-0.5 truncate">
                            {p.cultivarLabel}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[12px] font-medium px-2 py-0.5 rounded-full tabular-nums ${scorePillClass(p.olivatorScore)}`}>
                      {p.olivatorScore ?? '—'}
                    </span>
                    <span className="sr-only">{p.olivatorScore != null && p.olivatorScore >= 60 ? 'vysoké' : p.olivatorScore != null && p.olivatorScore >= 45 ? 'střední' : 'nízké'} skóre</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-text2 tabular-nums">
                    {p.acidity != null ? `${p.acidity} %` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-text2 tabular-nums">
                    {p.polyphenols != null ? `${p.polyphenols} mg/kg` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-text font-medium tabular-nums">
                    {formatPrice(p.price)}
                    {p.pricePer100ml != null && (
                      <div className="text-[10px] text-text3 font-normal">
                        {p.pricePer100ml.toFixed(0)} Kč/100ml
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/olej/${p.slug}`}
                      className="text-[12px] text-olive font-medium whitespace-nowrap hover:underline"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Karta — mobil (tabulka by horizontálně přesahovala) */}
        <div className="md:hidden bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
          {sorted.map((p) => {
            const expanded = expandedRow === p.slug
            return (
              <div key={p.slug} className="border-b border-off last:border-b-0">
                <button
                  onClick={() => setExpandedRow(expanded ? null : p.slug)}
                  className="w-full px-4 py-3 flex items-start gap-3 text-left"
                >
                  <div className="w-14 h-18 shrink-0 bg-off rounded-md overflow-hidden flex items-center justify-center" style={{ height: '4.5rem' }}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[22px] opacity-30">🫒</span>
                    )}
                  </div>
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full tabular-nums shrink-0 mt-0.5 ${scorePillClass(p.olivatorScore)}`}>
                    {p.olivatorScore ?? '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-text leading-tight">{p.name}</div>
                    <div className="text-[11px] text-text3 mt-0.5">
                      {[p.cultivarLabel, formatPrice(p.price)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span className="text-text3 text-[11px] mt-0.5">{expanded ? '▴' : '▾'}</span>
                </button>
                {expanded && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-2 text-[12px]">
                    <div><span className="text-text3">Kyselost:</span> {p.acidity != null ? `${p.acidity} %` : '—'}</div>
                    <div><span className="text-text3">Polyfenoly:</span> {p.polyphenols != null ? `${p.polyphenols} mg/kg` : '—'}</div>
                    {p.retailerName && (
                      <div><span className="text-text3">Prodejce:</span> {p.retailerName}</div>
                    )}
                    {p.pricePer100ml != null && (
                      <div><span className="text-text3">Za 100 ml:</span> {p.pricePer100ml.toFixed(0)} Kč</div>
                    )}
                    <Link href={`/olej/${p.slug}`} className="col-span-2 mt-2 text-olive text-[12px] font-medium">
                      Otevřít detail →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-8 text-text3 text-sm">
            Žádné produkty po aplikaci filtru.
          </div>
        )}
      </div>
    </section>
  )
}
