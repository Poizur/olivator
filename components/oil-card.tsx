'use client'

import Link from 'next/link'
import type { Product, ProductOffer } from '@/lib/types'
import { countryFlag, formatPrice, formatPricePer100ml, certLabel } from '@/lib/utils'
import { useCompare } from '@/lib/compare-context'

interface OilCardProps {
  product: Product
  offer?: ProductOffer
  isTop?: boolean
}

export function OilCard({ product, offer, isTop }: OilCardProps) {
  const { addItem, removeItem, isInCompare } = useCompare()
  const inCompare = isInCompare(product.id)

  return (
    <div className={`bg-white border rounded-[var(--radius-card)] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,.08)] ${
      isTop ? 'border-[1.5px] border-olive' : 'border-off2 hover:border-olive-light'
    }`}>
      {isTop && (
        <div className="bg-olive text-white text-center text-[10px] font-semibold py-1.5 tracking-wider uppercase">
          ★ Olivator volba
        </div>
      )}
      <Link href={`/olej/${product.slug}`}>
        <div className="h-[180px] bg-gradient-to-br from-off to-white flex items-center justify-center text-[80px] relative">
          🫒
          <div className="absolute bottom-3 right-3 bg-terra text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            Score {product.olivatorScore}
          </div>
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="text-[11px] text-text3 mb-1">
            {countryFlag(product.originCountry)} {product.originRegion}, {product.originCountry === 'GR' ? 'Řecko' : product.originCountry === 'IT' ? 'Itálie' : product.originCountry === 'ES' ? 'Španělsko' : product.originCountry === 'HR' ? 'Chorvatsko' : product.originCountry} &middot; {product.volumeMl} ml
          </div>
          <div className="text-[15px] font-medium text-text leading-tight mb-2.5 tracking-tight">
            {product.name}
          </div>
          <div className="flex gap-1 flex-wrap mb-3">
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-olive-bg text-olive-dark">
              Kyselost {product.acidity} %
            </span>
            {product.polyphenols > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-olive-bg text-olive-dark">
                Polyfenoly {product.polyphenols}
              </span>
            )}
            {product.certifications.map(c => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-lg bg-off text-text2">
                {certLabel(c)}
              </span>
            ))}
          </div>
          {offer && (
            <div className="flex items-center justify-between pt-3 border-t border-off">
              <div>
                <div className="text-[17px] font-semibold text-text tracking-tight">
                  {formatPrice(offer.price)}
                </div>
                <div className="text-[11px] text-text3 mt-0.5">
                  {formatPricePer100ml(offer.price, product.volumeMl)}
                </div>
                <div className="text-[11px] text-olive-light mt-0.5">
                  {offer.retailer.name}
                </div>
              </div>
              <span className="bg-olive text-white border-none rounded-full px-4 py-2 text-xs font-medium">
                Koupit →
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="px-4 pb-3">
        <button
          onClick={(e) => {
            e.preventDefault()
            inCompare ? removeItem(product.id) : addItem(product)
          }}
          className={`w-full text-center rounded-full py-1.5 text-[11px] font-medium cursor-pointer transition-all border-[1.5px] ${
            inCompare
              ? 'bg-olive text-white border-olive'
              : 'bg-transparent text-olive border-olive-light hover:bg-olive-bg'
          }`}
        >
          {inCompare ? '✓ Přidáno' : '+ Porovnat'}
        </button>
      </div>
    </div>
  )
}
