'use client'

import { useState } from 'react'
import { TopProductCard, type ProductWithOffer } from '@/components/home/top-product-card'
import Link from 'next/link'

interface Props {
  evooProducts: ProductWithOffer[]
  pomaceProducts: ProductWithOffer[]
  total: number
}

export function BulkProductTabs({ evooProducts, pomaceProducts, total }: Props) {
  const [tab, setTab] = useState<'evoo' | 'pomace'>('evoo')
  const active = tab === 'evoo' ? evooProducts : pomaceProducts

  return (
    <div>
      {/* Tab přepínače */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <button
          onClick={() => setTab('evoo')}
          className={`text-[13px] font-semibold px-4 py-2 rounded-full transition-colors ${
            tab === 'evoo'
              ? 'bg-olive text-white'
              : 'bg-white border border-off2 text-text2 hover:border-olive-border'
          }`}
        >
          Extra panenský olivový olej
          <span className={`ml-1.5 text-[11px] tabular-nums ${tab === 'evoo' ? 'opacity-70' : 'text-text3'}`}>
            {evooProducts.length}
          </span>
        </button>

        {pomaceProducts.length > 0 && (
          <button
            onClick={() => setTab('pomace')}
            className={`text-[13px] font-semibold px-4 py-2 rounded-full transition-colors ${
              tab === 'pomace'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-off2 text-text2 hover:border-amber-200'
            }`}
          >
            Z pokrutin (Pomace)
            <span className={`ml-1.5 text-[11px] tabular-nums ${tab === 'pomace' ? 'opacity-70' : 'text-text3'}`}>
              {pomaceProducts.length}
            </span>
          </button>
        )}
      </div>

      {/* Info note pro pokrutiny */}
      {tab === 'pomace' && (
        <p className="text-[12px] text-text3 mb-5">
          Vyráběn extrakcí z výlisků lisování · méně polyfenolů · vhodný pro smažení a vaření ve větším množství
        </p>
      )}

      {/* Grid produktů */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
        {active.map((p, i) => (
          <TopProductCard key={p.id} product={p} rank={i + 1} />
        ))}
      </div>

      {total > 15 && (
        <div className="mt-8 text-center">
          <Link
            href="/srovnavac?volume=5l"
            className="inline-block border border-olive-border text-olive text-[14px] font-medium px-6 py-2.5 rounded-lg hover:bg-olive-bg transition-colors"
          >
            Zobrazit všech {total} produktů ve srovnávači →
          </Link>
        </div>
      )}
    </div>
  )
}
