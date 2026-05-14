// Multi-retailer panel — zobrazí všechny nabídky v grid layoutu.
// Používá se na produktové stránce jako full-width sekce po hero bloku.

import { AffiliateLink } from '@/components/affiliate-link'
import { formatPrice, formatPricePer100ml } from '@/lib/utils'
import type { ProductOffer } from '@/lib/types'
import Image from 'next/image'

interface Props {
  offers: ProductOffer[]
  volumeMl: number
  productSlug: string
  productName: string
}

export function WhereToBuyPanel({ offers, volumeMl, productSlug, productName }: Props) {
  if (offers.length < 2) return null

  const cheapestPrice = offers[0]?.price

  const countLabel = offers.length === 1 ? 'prodejce' : offers.length < 5 ? 'prodejci' : 'prodejců'

  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-2 mb-4">
        <h2 className="text-[13px] font-semibold text-text tracking-wide">
          Kde koupit
        </h2>
        <span className="text-[12px] text-text3">
          {offers.length} {countLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {offers.map((offer, i) => {
          const isCheapest = offer.price === cheapestPrice && i === 0
          return (
            <AffiliateLink
              key={offer.id}
              data={{
                productSlug,
                productName,
                retailerSlug: offer.retailer.slug,
                retailerName: offer.retailer.name,
                price: offer.price,
                source: 'product_page',
              }}
              className={`flex flex-col p-4 rounded-[var(--radius-card)] border transition-all cursor-pointer ${
                isCheapest
                  ? 'border-olive bg-olive-bg hover:border-olive-dark'
                  : 'border-off2 bg-white hover:border-olive-border hover:bg-olive-bg/40'
              }`}
            >
              {/* Header: logo + jméno */}
              <div className="flex items-center gap-2.5 mb-3">
                {offer.retailer.logoUrl ? (
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-white border border-off2 shrink-0 flex items-center justify-center">
                    <Image
                      src={offer.retailer.logoUrl}
                      alt={offer.retailer.name}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md bg-off2 shrink-0 flex items-center justify-center text-[11px] font-bold text-text3">
                    {offer.retailer.name.charAt(0)}
                  </div>
                )}
                <span className="text-[13px] font-medium text-text leading-tight">{offer.retailer.name}</span>
              </div>

              {/* Cena */}
              <div className="mb-2">
                <div className="text-[22px] font-bold text-text tracking-tight leading-none">
                  {formatPrice(offer.price)}
                </div>
                {volumeMl > 0 && (
                  <div className="text-[11px] text-text3 mt-0.5">
                    {formatPricePer100ml(offer.price, volumeMl)}
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {isCheapest && (
                  <span className="text-[10px] font-semibold bg-olive text-white px-2 py-0.5 rounded-full">
                    Nejlevněji
                  </span>
                )}
                {offer.inStock ? (
                  <span className="text-[10px] font-medium text-olive-dark bg-olive-bg px-2 py-0.5 rounded-full border border-olive-border">
                    ✓ Skladem
                  </span>
                ) : (
                  <span className="text-[10px] text-text3 bg-off px-2 py-0.5 rounded-full border border-off2">
                    Není skladem
                  </span>
                )}
              </div>

              {/* CTA */}
              <div className={`mt-auto text-center text-[13px] font-medium py-2 px-3 rounded-lg ${
                isCheapest
                  ? 'bg-olive text-white'
                  : 'bg-off2 text-text hover:bg-off'
              }`}>
                Koupit u {offer.retailer.name} →
              </div>
            </AffiliateLink>
          )
        })}
      </div>
    </section>
  )
}
