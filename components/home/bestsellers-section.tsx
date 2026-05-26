import Link from 'next/link'
import { Flame } from 'lucide-react'
import { TopProductCard } from './top-product-card'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

interface Props {
  products: ProductWithOffer[]
  totalCount: number
}

export function BestsellersSection({ products, totalCount }: Props) {
  if (products.length === 0) return null

  return (
    <section className="px-6 md:px-10 py-14 border-t border-off2 bg-[#FAEEDA]">
      <div className="max-w-[1280px] mx-auto">

        <div className="flex items-end justify-between mb-7 flex-wrap gap-3">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-terra mb-1.5 inline-flex items-center gap-1.5">
              <Flame size={11} strokeWidth={2.25} className="text-terra" />
              Bestsellery
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-[32px] font-normal text-text leading-tight">
              Co Češi reálně kupují
            </h2>
            <p className="text-[14px] text-text2 mt-1">
              Nejpopulárnější oleje napříč značkami — bez ohledu na Score.
            </p>
          </div>
          <Link
            href="/nejprodavanejsi"
            className="text-[12px] text-olive font-semibold hover:text-olive2 transition-colors whitespace-nowrap border-b border-olive/30 hover:border-olive2/50"
          >
            Všech {totalCount} bestsellerů →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
          {products.map((p, i) => (
            <TopProductCard
              key={p.id}
              product={p}
              rank={i + 1}
              badge={{ label: '🔥 Bestseller', hint: 'Nejprodávanější — reálná popularita', tone: 'terra' }}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
            />
          ))}
        </div>

      </div>
    </section>
  )
}
