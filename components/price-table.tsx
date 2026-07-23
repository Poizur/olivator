import type { ProductOffer } from '@/lib/types'
import { formatPrice, formatPricePer100ml } from '@/lib/utils'
import { AffiliateLink } from './affiliate-link'

/** Render rating as Unicode stars: full ★, half ⯨ (approx), empty ☆.
 *  4.7 → "★★★★★" (rounds half-up to 5 if >= .5).
 *  Conservative — we don't show half stars to keep glyphs simple. */
function renderStars(rating: number): string {
  const rounded = Math.round(rating)
  return '★'.repeat(rounded) + '☆'.repeat(Math.max(0, 5 - rounded))
}

interface PriceTableProps {
  offers: ProductOffer[]
  volumeMl: number
  productSlug: string
  productName: string
}

export function PriceTable({ offers, volumeMl, productSlug, productName }: PriceTableProps) {
  if (offers.length === 0) return null

  return (
    <div className="mt-5 mb-5">
      <h2 className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-2.5">
        Kde koupit nejlevněji
      </h2>
      {offers.map((offer, i) => {
        const inStock = offer.inStock !== false
        const isFirstInStock = inStock && offers.slice(0, i).every(o => !o.inStock)

        const inner = (
          <>
            <div>
              <div className={`text-[13px] font-medium ${inStock ? 'text-text' : 'text-text3'}`}>
                {offer.retailer.name}
                {inStock && isFirstInStock && (
                  <span className="text-[10px] bg-olive text-white px-[7px] py-0.5 rounded-full font-semibold ml-1.5">
                    Nejlevněji
                  </span>
                )}
                {!inStock && (
                  <span className="text-[10px] bg-off text-text3 px-[7px] py-0.5 rounded-full font-medium ml-1.5">
                    Vyprodáno
                  </span>
                )}
              </div>
              {inStock && offer.retailer.rating != null && offer.retailer.rating > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-terra" aria-label={`Hodnocení ${offer.retailer.rating} z 5`}>
                    {renderStars(offer.retailer.rating)}
                  </span>
                  <span className="text-[10px] text-text3">
                    {offer.retailer.rating.toFixed(1)}
                    {offer.retailer.ratingCount ? ` (${offer.retailer.ratingCount.toLocaleString('cs-CZ')} hodnocení)` : ''}
                  </span>
                </div>
              )}
              {inStock && isFirstInStock && offer.retailer.rating == null && (
                <div className="text-[11px] text-olive-light mt-0.5">Doručení dnes</div>
              )}
            </div>
            <div className="text-right">
              <div className={`text-base font-semibold tabular-nums ${inStock ? 'text-text' : 'text-text3 line-through'}`}>
                {formatPrice(offer.price)}
              </div>
              <div className="text-[11px] text-text3 tabular-nums whitespace-nowrap">
                {formatPricePer100ml(offer.price, volumeMl)}
              </div>
            </div>
          </>
        )

        if (!inStock) {
          return (
            <div
              key={offer.id}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl border mb-2 border-off2 opacity-60"
            >
              {inner}
            </div>
          )
        }

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
            className={`flex items-center justify-between px-3.5 py-3 rounded-xl border mb-2 cursor-pointer transition-all ${
              isFirstInStock
                ? 'border-olive bg-olive-bg hover:border-olive-dark'
                : 'border-off2 hover:border-olive-border hover:bg-olive-bg'
            }`}
          >
            {inner}
          </AffiliateLink>
        )
      })}
    </div>
  )
}
