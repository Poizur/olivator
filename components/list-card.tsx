'use client'

import Link from 'next/link'
import type { Product, ProductOffer } from '@/lib/types'
import { countryName, formatPrice, formatPricePer100ml, certLabel } from '@/lib/utils'
import { ProductImage } from './product-image'
import { WishlistButton } from './wishlist-button'

interface ListCardProps {
  product: Product
  offer?: ProductOffer
  rank: number
  /** Compact variant for narrow sidebars (entity pages, etc) — stacks vertically. */
  compact?: boolean
}

export function ListCard({ product, offer, rank, compact = false }: ListCardProps) {
  if (compact) {
    return <CompactCard product={product} offer={offer} rank={rank} />
  }

  return (
    <Link href={`/olej/${product.slug}`}>
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] px-5 py-4 flex items-center gap-5 cursor-pointer transition-all hover:border-olive-light hover:shadow-[0_4px_16px_rgba(0,0,0,.06)]">
        <div className={`text-[22px] font-bold w-8 shrink-0 text-center tabular-nums ${
          rank <= 3 ? 'text-terra' : 'text-off2'
        }`}>
          {rank}
        </div>

        {/* Větší foto — obrázky prodávají, portrait aspect 3:4 (60×80) */}
        <div className="w-20 h-[6.5rem] bg-off rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
          <ProductImage product={product} fallbackSize="text-5xl" sizes="80px" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-text3 mb-0.5 uppercase tracking-widest font-medium">
            {product.originRegion ? `${product.originRegion} · ` : ''}{countryName(product.originCountry)}
          </div>
          <div className="text-[15px] font-medium text-text mb-1.5 tracking-tight">
            {product.name}
          </div>
          <div className="flex gap-1 flex-wrap">
            {product.acidity != null && (
              <span className={`text-[10px] px-[7px] py-0.5 rounded-md ${
                product.acidity <= 0.3 ? 'bg-olive-bg text-olive-dark' : 'bg-off text-text2'
              }`}>
                Kyselost {product.acidity} %
              </span>
            )}
            {product.polyphenols != null && (
              <span className="text-[10px] px-[7px] py-0.5 rounded-md bg-off text-text2">
                Polyfenoly {product.polyphenols}
              </span>
            )}
            {product.certifications.map(c => (
              <span key={c} className="text-[10px] px-[7px] py-0.5 rounded-md bg-off text-text2">
                {certLabel(c)}
              </span>
            ))}
            {!product.ean && (
              <span
                className="text-[10px] px-[7px] py-0.5 rounded-md bg-terra-bg text-terra font-medium"
                title="Přímo od výrobce"
              >
                Od výrobce
              </span>
            )}
          </div>
        </div>

        <div className="text-center shrink-0">
          <div className="text-2xl font-bold text-terra tracking-tight">
            {product.olivatorScore}
          </div>
          <div className="text-[10px] text-text3 uppercase tracking-wider">
            Score
          </div>
        </div>

        {offer && (
          <div className="text-right shrink-0">
            <div className="text-lg font-semibold text-text tracking-tight">
              {formatPrice(offer.price)}
            </div>
            <div className="text-[11px] text-text3">
              {formatPricePer100ml(offer.price, product.volumeMl)}
            </div>
            <div className="text-[11px] text-olive-light">
              {offer.retailer.name}
            </div>
          </div>
        )}

        <span className="bg-olive text-white border-none rounded-full px-4 py-2 text-xs font-medium shrink-0">
          Koupit
        </span>
        <WishlistButton productId={product.id} className="shrink-0" />
      </div>
    </Link>
  )
}

function CompactCard({ product, offer, rank }: { product: Product; offer?: ProductOffer; rank: number }) {
  return (
    <Link
      href={`/olej/${product.slug}`}
      className="block bg-white border border-off2 rounded-[var(--radius-card)] p-4 hover:border-olive-light hover:shadow-md transition-all"
    >
      {/* Top row: rank + image + score */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`text-[18px] font-bold tabular-nums leading-none mt-1 shrink-0 ${
          rank <= 3 ? 'text-terra' : 'text-text3'
        }`}>
          {rank}
        </div>
        {/* Foto — větší pro lepší vizibilitu (15×20 = 60×80px) */}
        <div className="w-15 h-20 bg-off rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ width: '3.75rem' }}>
          <ProductImage product={product} fallbackSize="text-3xl" sizes="60px" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-text3 mb-0.5 uppercase tracking-widest font-medium truncate">
            {product.originRegion ? `${product.originRegion} · ` : ''}{countryName(product.originCountry)}
          </div>
          <div className="text-[13px] font-medium text-text leading-tight line-clamp-2">
            {product.name}
          </div>
        </div>
        <div className="bg-terra text-white text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0">
          {product.olivatorScore}
        </div>
      </div>

      {/* Bottom row: price + retailer */}
      {offer && (
        <div className="flex items-center justify-between pt-2 border-t border-off">
          <div>
            <div className="text-[15px] font-semibold text-text tabular-nums">
              {formatPrice(offer.price)}
            </div>
            <div className="text-[10px] text-text3">
              {formatPricePer100ml(offer.price, product.volumeMl)} · {offer.retailer.name}
            </div>
          </div>
          <span className="text-[11px] text-olive font-medium">
            Detail →
          </span>
        </div>
      )}
    </Link>
  )
}
