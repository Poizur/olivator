// Sdílená karta pro TOP 12 a TopByCountry sekce.
// Hranatý styl dle mockupu — fixní výška obrázku, světlé pozadí, kompaktní layout.

import Link from 'next/link'
import { formatPrice, formatPricePer100ml, countryFlag } from '@/lib/utils'
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
  variant?: 'default' | 'large'
}

export function TopProductCard({
  product,
  rank,
  badge,
  sizes = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px',
  variant = 'default',
}: Props) {
  const isLarge = variant === 'large'

  return (
    <Link
      href={`/olej/${product.slug}`}
      className={`group bg-white border border-off2 overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 ${
        isLarge
          ? 'rounded-[var(--radius-card)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]'
          : 'rounded-lg hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:border-olive-mid'
      }`}
    >
      {/* Image */}
      <div className={`relative bg-white overflow-hidden ${isLarge ? 'aspect-[4/5]' : 'h-[110px]'}`}>
        {/* Badge vlevo nahoře */}
        {badge ? (
          <span
            className={`absolute top-1.5 left-1.5 z-10 text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 shadow-sm leading-none ${badgeClass(badge.tone)}`}
            title={badge.hint}
          >
            {badge.label}
          </span>
        ) : (
          <span className="absolute top-1.5 left-1.5 z-10 text-[10px] font-bold text-text bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 shadow-sm leading-none">
            #{rank}
          </span>
        )}

        {/* Score vpravo nahoře */}
        <span className={`absolute top-1.5 right-1.5 z-10 ${isLarge ? 'shadow-md rounded-full' : ''}`}>
          <ScoreBadge score={product.olivatorScore} type={product.type} size="small" />
        </span>

        {/* Produkt obrázek */}
        <div className={`absolute inset-0 transition-transform duration-300 ${isLarge ? 'group-hover:scale-105' : 'top-[22px] group-hover:scale-[1.04]'}`}>
          <ProductImage product={product} fallbackSize={isLarge ? 'text-[60px]' : 'text-[52px]'} sizes={sizes} />
        </div>
      </div>

      {/* Text */}
      <div className={`flex-1 flex flex-col ${isLarge ? 'p-2' : 'p-2.5'}`}>
        {/* Původ + vlajka */}
        <div className="text-[10px] text-text3 mb-0.5 leading-tight truncate">
          {countryFlag(product.originCountry)}
          {product.nameShort && (
            <span className="ml-1">{product.nameShort}</span>
          )}
        </div>

        {/* Název produktu */}
        <div className={`font-medium text-text leading-snug line-clamp-2 flex-1 mb-1.5 ${isLarge ? 'text-[10px] font-semibold min-h-[2.4em]' : 'text-[12px]'}`}>
          {product.name}
        </div>

        {/* Cena */}
        {product.cheapestOffer && (
          <div className="pt-1.5 border-t border-off flex items-baseline gap-1">
            <span className="text-[14px] font-bold text-text tabular-nums leading-none">
              {formatPrice(product.cheapestOffer.price)}
            </span>
            <span className="text-[10px] text-text2 ml-auto tabular-nums">
              {formatPricePer100ml(product.cheapestOffer.price, product.volumeMl)}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
