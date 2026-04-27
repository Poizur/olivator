'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { ListCard } from '@/components/list-card'
import { FilterPanel, type FilterCounts } from '@/components/filter-panel'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

export function ListingContent({ products, counts }: { products: ProductWithOffer[]; counts: FilterCounts }) {
  const searchParams = useSearchParams()

  const activeTypes = searchParams.get('type')?.split(',').filter(Boolean) || []
  const activeOrigins = searchParams.get('origin')?.split(',').filter(Boolean) || []
  const activeCerts = searchParams.get('cert')?.split(',').filter(Boolean) || []
  const activeQuality = searchParams.get('quality')?.split(',').filter(Boolean) || []
  const sort = searchParams.get('sort') || 'score'

  const filtered = useMemo(() => {
    let list = [...products]

    if (activeTypes.length > 0) {
      list = list.filter(p => activeTypes.includes(p.type))
    }
    if (activeOrigins.length > 0) {
      list = list.filter(p => activeOrigins.includes(p.originCountry))
    }
    if (activeCerts.length > 0) {
      list = list.filter(p =>
        activeCerts.some(c => p.certifications.includes(c))
      )
    }
    if (activeQuality.includes('high_polyphenols')) {
      list = list.filter(p => p.polyphenols != null && p.polyphenols >= 500)
    }

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => (a.cheapestOffer?.price ?? 9999) - (b.cheapestOffer?.price ?? 9999))
        break
      case 'acidity':
        // Null acidity sorted last (we treat missing data as worst for lower-better)
        list.sort((a, b) => (a.acidity ?? 999) - (b.acidity ?? 999))
        break
      case 'polyphenols':
        // Null polyphenols sorted last (higher is better)
        list.sort((a, b) => (b.polyphenols ?? 0) - (a.polyphenols ?? 0))
        break
      default:
        list.sort((a, b) => b.olivatorScore - a.olivatorScore)
    }

    return list
  }, [products, activeTypes, activeOrigins, activeCerts, activeQuality, sort])

  const filterDesc = [
    activeTypes.length > 0 ? activeTypes.join(', ') : null,
    activeOrigins.length > 0 ? activeOrigins.join(' + ') : null,
    activeCerts.length > 0 ? activeCerts.join(', ') : null,
    activeQuality.includes('high_polyphenols') ? 'polyfenoly ≥500' : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="max-w-[1080px] mx-auto px-10 py-10">
      <div className="mb-7">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-1.5">
          Srovnávač olivových olejů
        </h1>
        <p className="text-[15px] text-text2 font-light">
          {filtered.length} produktů &middot; aktualizováno dnes
        </p>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-7 items-start">
        <FilterPanel counts={counts} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-text2">
              <strong className="text-text">{filtered.length} výsledků</strong>
              {filterDesc && <> &middot; {filterDesc}</>}
            </div>
            <select
              className="bg-off border-none rounded-lg px-3 py-1.5 text-[13px] text-text cursor-pointer"
              defaultValue={sort}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('sort', e.target.value)
                window.location.search = params.toString()
              }}
            >
              <option value="score">Olivator Score</option>
              <option value="price_asc">Cena: nejlevnější</option>
              <option value="acidity">Kyselost</option>
              <option value="polyphenols">Polyfenoly</option>
            </select>
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
            <div className="text-center py-20 text-text3">
              Žádné oleje neodpovídají vybraným filtrům.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
