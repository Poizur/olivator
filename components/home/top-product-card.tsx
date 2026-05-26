// Sdílená karta pro TOP 12 a TopByCountry sekce.
// Kompaktní portrait karta — shodný vzhled v obou sekcích.

import Link from 'next/link'
import { countryName, formatPrice, formatPricePer100ml } from '@/lib/utils'
import { ScoreBadge } from '@/components/score-badge'
import { ProductImage } from '@/components/product-image'
import type { Product, ProductOffer } from '@/lib/types'
import type { ProductBadge } from '@/lib/product-badges'

export type { ProductBadge }

export type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

export function badgeClass(tone: 'gold' | 'olive' | 'terra' | 'amber' | 'sage'): string {
  switch (tone) {
    case 'gold':  return 'bg-terra text-white'
    case 'olive': return 'bg-olive text-white'
    case 'terra': return 'bg-terra-bg text-terra'
    case 'amber': return 'bg-amber-100 text-amber-800'
    case 'sage':  return 'bg-olive-bg text-olive-dark'
  }
}

interface Props {
  product: ProductWithOffer
  rank: number
  badge?: ProductBadge | null
  sizes?: string
}

export function TopProductCard({
  product,
  rank,
  badge,
  sizes = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px',
}: Props) {
  return (
    <Link
      href={`/olej/${product.slug}`}
      className="group bg-white border border-off2 rounded-lg overflow-hidden flex flex-col transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:border-olive-mid"
    >
      <div className="relative aspect-[4/5] bg-white overflow-hidden">
        {badge && (
          <span
            className={`absolute top-1.5 left-1.5 z-10 text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 shadow-sm ${badgeClass(badge.tone)}`}
            title={badge.hint}
          >
            {badge.label}
          </span>
        )}
        {!badge && (
          <span className="absolute top-1.5 left-1.5 z-10 text-[10px] font-bold tracking-widest uppercase text-text bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 shadow-sm">
            #{rank}
          </span>
        )}
        <span className="absolute top-1.5 right-1.5 z-10 shadow-md rounded-full">
          <ScoreBadge score={product.olivatorScore} type={product.type} size="medium" />
        </span>
        <span
          className="absolute bottom-1.5 left-1.5 z-10 leading-none bg-white/90 backdrop-blur-sm rounded px-1 py-0.5 shadow-sm flex items-center"
          title={countryName(product.originCountry)}
          data-nosnippet
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://flagcdn.com/w20/${(product.originCountry ?? '').toLowerCase()}.png`}
            alt=""
            width={16}
            height={12}
            className="rounded-[2px]"
          />
        </span>
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
          <ProductImage
            product={product}
            fallbackSize="text-[60px]"
            sizes={sizes}
          />
        </div>
      </div>

      <div className="p-2.5 flex-1 flex flex-col">
        <div className="text-[11px] font-semibold text-text leading-tight mb-1.5 line-clamp-2 min-h-[2.4em]">
          {product.name}
        </div>

        {product.cheapestOffer && (
          <div className="mt-auto pt-1.5 border-t border-off">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <div className="text-[13px] font-bold text-text leading-tight tabular-nums">
                {formatPrice(product.cheapestOffer.price)}
              </div>
              <div className="text-[9px] font-semibold text-terra bg-terra-bg rounded px-1 py-0.5 tabular-nums">
                {formatPricePer100ml(product.cheapestOffer.price, product.volumeMl)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
