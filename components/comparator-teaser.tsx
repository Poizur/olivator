import Link from 'next/link'
import { Trophy, Leaf, Gift } from 'lucide-react'
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
        <div className="text-center mb-10">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
            Kurátorský výběr
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight mb-4">
            Srovnej. <em className="text-olive italic">Rozhodni.</em>
          </h2>
          <p className="text-[17px] font-medium text-text max-w-[440px] mx-auto leading-relaxed">
            {totalProducts} olejů. {totalRetailers} prodejců.{' '}
            <span className="text-text2 font-normal">Žádné reklamy — jen data.</span>
          </p>
        </div>

        {/* ── Hero karty ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {duels.map((d) => {
            const p = d.products[0]
            if (!p) return null
            const Icon = d.icon
            const per100ml =
              p.cheapestOffer && p.volumeMl
                ? Math.round((p.cheapestOffer.price / p.volumeMl) * 100)
                : null

            return (
              <div
                key={d.key}
                className="bg-white border border-off2 rounded-[var(--radius-card)] p-5 flex flex-col hover:border-olive-light hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all"
              >
                {/* Kategorie badge */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-full bg-olive-bg flex items-center justify-center shrink-0">
                    <Icon size={14} strokeWidth={1.75} className="text-olive" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-text leading-tight">{d.label}</div>
                    <div className="text-[10px] text-text3 truncate">{d.sub}</div>
                  </div>
                </div>

                {/* Hero obrázek */}
                <Link
                  href={`/olej/${p.slug}`}
                  className="block aspect-square bg-off rounded-xl overflow-hidden mb-4 relative group"
                >
                  <ProductImage
                    product={p}
                    fallbackSize="text-5xl"
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Název */}
                <Link href={`/olej/${p.slug}`} className="block mb-3 group">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-0.5">
                    {p.nameShort?.split(' ').slice(0, 2).join(' ') ?? p.brandSlug ?? ''}
                  </div>
                  <div className="text-[15px] font-semibold text-text leading-snug line-clamp-2 group-hover:text-olive transition-colors">
                    {p.nameShort || p.name}
                  </div>
                </Link>

                {/* Score + Cena */}
                <div className="flex items-center justify-between mb-4">
                  <ScoreBadge score={p.olivatorScore} type={p.type} size="medium" />
                  {p.cheapestOffer && (
                    <div className="text-right">
                      <div className="text-[22px] font-bold text-text tabular-nums leading-tight">
                        {formatPrice(p.cheapestOffer.price)}
                      </div>
                      {per100ml && (
                        <div className="text-[10px] text-text3">{per100ml} Kč / 100 ml</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Value prop */}
                <p className="text-[12px] text-text2 leading-relaxed mb-5 flex-1">
                  {d.hint}
                </p>

                {/* CTA — skutečné tlačítko */}
                <Link
                  href={`/olej/${p.slug}`}
                  className="block w-full bg-olive hover:bg-olive2 text-white text-[13px] font-semibold text-center py-2.5 rounded-full transition-colors"
                >
                  Zobrazit detail →
                </Link>
              </div>
            )
          })}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="text-center mt-8">
          <Link
            href="/srovnavac"
            className="inline-flex items-center gap-1.5 text-[13px] text-olive font-semibold hover:text-olive2 transition-colors"
          >
            Procházet celý katalog →
          </Link>
        </div>

      </div>
    </section>
  )
}

export { Trophy, Leaf, Gift }
