'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { getProducts, getCheapestOffer } from '@/lib/mock-data'
import { ListCard } from '@/components/list-card'
import { FilterPanel } from '@/components/filter-panel'
import type { Product } from '@/lib/types'

export function ListingContent() {
  const searchParams = useSearchParams()

  const activeTypes = searchParams.get('type')?.split(',').filter(Boolean) || []
  const activeOrigins = searchParams.get('origin')?.split(',').filter(Boolean) || []
  const activeCerts = searchParams.get('cert')?.split(',').filter(Boolean) || []
  const sort = searchParams.get('sort') || 'score'

  const filtered = useMemo(() => {
    let products = getProducts()

    if (activeTypes.length > 0) {
      products = products.filter(p => activeTypes.includes(p.type))
    }
    if (activeOrigins.length > 0) {
      products = products.filter(p => activeOrigins.includes(p.originCountry))
    }
    if (activeCerts.length > 0) {
      products = products.filter(p =>
        activeCerts.some(c => p.certifications.includes(c))
      )
    }

    switch (sort) {
      case 'price_asc':
        products.sort((a, b) => {
          const oa = getCheapestOffer(a.id)
          const ob = getCheapestOffer(b.id)
          return (oa?.price || 9999) - (ob?.price || 9999)
        })
        break
      case 'acidity':
        products.sort((a, b) => a.acidity - b.acidity)
        break
      case 'polyphenols':
        products.sort((a, b) => b.polyphenols - a.polyphenols)
        break
      default:
        products.sort((a, b) => b.olivatorScore - a.olivatorScore)
    }

    return products
  }, [activeTypes, activeOrigins, activeCerts, sort])

  const filterDesc = [
    activeTypes.length > 0 ? activeTypes.join(', ') : null,
    activeOrigins.length > 0 ? activeOrigins.join(' + ') : null,
    activeCerts.length > 0 ? activeCerts.join(', ') : null,
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
        <FilterPanel />

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
                offer={getCheapestOffer(p.id)}
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
