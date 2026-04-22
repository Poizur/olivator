'use client'

import Link from 'next/link'
import type { Product, ProductOffer } from '@/lib/types'
import { countryFlag, countryName, formatPrice, formatPricePer100ml, certLabel } from '@/lib/utils'
import { ProductImage } from './product-image'

interface ListCardProps {
  product: Product
  offer?: ProductOffer
  rank: number
}

export function ListCard({ product, offer, rank }: ListCardProps) {
  return (
    <Link href={`/olej/${product.slug}`}>
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] px-5 py-4 flex items-center gap-5 cursor-pointer transition-all hover:border-olive-light hover:shadow-[0_4px_16px_rgba(0,0,0,.06)]">
        <div className={`text-[22px] font-bold w-8 shrink-0 text-center tabular-nums ${
          rank <= 3 ? 'text-terra' : 'text-off2'
        }`}>
          {rank}
        </div>

        <div className="w-16 h-20 bg-off rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
          <ProductImage product={product} fallbackSize="text-4xl" sizes="80px" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-text3 mb-0.5">
            {countryFlag(product.originCountry)} {product.originRegion}, {countryName(product.originCountry)}
          </div>
          <div className="text-[15px] font-medium text-text mb-1.5 tracking-tight">
            {product.name}
          </div>
          <div className="flex gap-1 flex-wrap">
            <span className={`text-[10px] px-[7px] py-0.5 rounded-md ${
              product.acidity <= 0.3 ? 'bg-olive-bg text-olive-dark' : 'bg-off text-text2'
            }`}>
              Kyselost {product.acidity} %
            </span>
            <span className="text-[10px] px-[7px] py-0.5 rounded-md bg-off text-text2">
              Polyfenoly {product.polyphenols}
            </span>
            {product.certifications.map(c => (
              <span key={c} className="text-[10px] px-[7px] py-0.5 rounded-md bg-off text-text2">
                {certLabel(c)}
              </span>
            ))}
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
      </div>
    </Link>
  )
}
