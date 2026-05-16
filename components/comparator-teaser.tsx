import Link from 'next/link'
import { Trophy, Leaf, Gift, ArrowLeftRight } from 'lucide-react'
import { ProductImage } from './product-image'
import { ScoreBadge } from './score-badge'
import { formatPrice } from '@/lib/utils'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

export interface Duel {
  key: string
  icon: typeof Trophy
  label: string
  sub: string
  hint: string
  products: ProductWithOffer[]
}

export function ComparatorTeaser({
  duels,
  totalProducts,
  totalRetailers,
}: {
  duels: Duel[]
  totalProducts: number
  totalRetailers: number
}) {
  if (duels.length === 0) return null

  return (
    <section className="px-6 md:px-10 py-16 bg-off/40 border-y border-off2">
      <div className="max-w-[1280px] mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2 inline-flex items-center gap-1.5">
            <ArrowLeftRight size={11} strokeWidth={2.25} />
            Porovnání olejů
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight mb-3">
            Srovnej. <em className="text-olive italic">Rozhodni.</em>
          </h2>
          <p className="text-[17px] font-medium text-text max-w-[440px] mx-auto leading-relaxed">
            {totalProducts} olejů. {totalRetailers} prodejců.{' '}
            <span className="text-text2 font-normal">Žádné reklamy — jen data.</span>
          </p>
        </div>

        {/* ── 3×3 porovnávací karty ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {duels.map((d) => {
            const slug = d.products.map((p) => p.slug).join('-vs-')
            const Icon = d.icon
            return (
              <Link
                key={d.key}
                href={`/porovnani/${slug}`}
                className="group bg-white border border-off2 rounded-[var(--radius-card)] p-5 transition-all hover:border-olive-light hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 flex flex-col"
              >
                {/* Kategorie header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-full bg-olive-bg flex items-center justify-center shrink-0">
                    <Icon size={14} strokeWidth={1.75} className="text-olive" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-text leading-tight">{d.label}</div>
                    <div className="text-[10px] text-text3 truncate">{d.sub}</div>
                  </div>
                </div>

                {/* 3 mini produktové karty vedle sebe */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {d.products.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="bg-off rounded-lg p-2 flex flex-col items-center text-center"
                    >
                      <div className="w-full aspect-square bg-white rounded mb-1.5 overflow-hidden">
                        <ProductImage
                          product={p}
                          fallbackSize="text-2xl"
                          sizes="80px"
                        />
                      </div>
                      <div className="text-[9px] font-semibold text-text leading-tight line-clamp-2 mb-1.5 min-h-[2.2em]">
                        {p.nameShort || p.name}
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <ScoreBadge score={p.olivatorScore} type={p.type} size="small" />
                        {p.cheapestOffer && (
                          <span className="text-[10px] font-semibold text-text tabular-nums">
                            {formatPrice(p.cheapestOffer.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[12px] text-text2 leading-relaxed mb-4 line-clamp-2 min-h-[2.6em]">
                  {d.hint}
                </p>

                {/* CTA — tlačítko */}
                <div className="mt-auto flex items-center justify-center gap-1.5 bg-olive group-hover:bg-olive2 text-white text-[12px] font-semibold rounded-full py-2 px-4 transition-colors">
                  <ArrowLeftRight size={11} strokeWidth={2.25} />
                  Otevřít porovnání
                </div>
              </Link>
            )
          })}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="text-center mt-7">
          <Link
            href="/porovnani"
            className="inline-flex items-center gap-1.5 text-[13px] text-olive font-semibold hover:text-olive2 transition-colors"
          >
            Postav si vlastní porovnání →
          </Link>
        </div>

      </div>
    </section>
  )
}

export { Trophy, Leaf, Gift }
