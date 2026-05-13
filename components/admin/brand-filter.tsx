'use client'

import Link from 'next/link'
import { useState } from 'react'

interface BrandItem {
  slug: string
  count: number
  label: string
  href: string
}

interface Props {
  brands: BrandItem[]
  noBrandCount: number
  noBrandHref: string
  allHref: string
  currentBrand: string | undefined
}

const COLLAPSED_LIMIT = 10

export function BrandFilter({ brands, noBrandCount, noBrandHref, allHref, currentBrand }: Props) {
  const activeIsHidden =
    currentBrand &&
    currentBrand !== '__none__' &&
    brands.findIndex(b => b.slug === currentBrand) >= COLLAPSED_LIMIT

  const [expanded, setExpanded] = useState(!!activeIsHidden)

  const visibleBrands = expanded ? brands : brands.slice(0, COLLAPSED_LIMIT)
  const hiddenCount = brands.length - COLLAPSED_LIMIT

  const pillBase = 'text-[13px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap'
  const pillActive = 'bg-olive text-white'
  const pillInactive = 'bg-white border border-off2 text-text2 hover:border-olive3 hover:text-olive'

  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-1.5">Výrobce</div>

      <div className={`flex gap-2 flex-wrap ${expanded ? 'max-h-52 overflow-y-auto pr-1' : ''}`}>
        <Link href={allHref} className={`${pillBase} ${!currentBrand ? pillActive : pillInactive}`}>
          Všichni
        </Link>

        {visibleBrands.map(b => (
          <Link
            key={b.slug}
            href={b.href}
            className={`${pillBase} ${currentBrand === b.slug ? pillActive : pillInactive}`}
          >
            {b.label} ({b.count})
          </Link>
        ))}

        {noBrandCount > 0 && (expanded || !currentBrand || currentBrand === '__none__') && (
          <Link
            href={noBrandHref}
            className={`${pillBase} ${
              currentBrand === '__none__'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 border border-amber-200 text-amber-700 hover:border-amber-400'
            }`}
            title="Produkty bez přiřazené značky — admin musí doplnit"
          >
            Bez výrobce ({noBrandCount})
          </Link>
        )}
      </div>

      {brands.length > COLLAPSED_LIMIT && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-1.5 text-[12px] text-olive hover:text-olive2 font-medium"
        >
          {expanded ? '↑ Skrýt' : `↓ Zobrazit vše (${hiddenCount + (noBrandCount > 0 ? 1 : 0)} dalších)`}
        </button>
      )}
    </div>
  )
}
