import type { ProductOffer } from '@/lib/types'
import { formatPrice, formatPricePer100ml } from '@/lib/utils'

interface PriceTableProps {
  offers: ProductOffer[]
  volumeMl: number
}

export function PriceTable({ offers, volumeMl }: PriceTableProps) {
  if (offers.length === 0) return null
  const cheapest = offers[0]

  return (
    <div className="mt-5 mb-5">
      <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-2.5">
        Kde koupit nejlevněji
      </div>
      {offers.map((offer, i) => (
        <div
          key={offer.id}
          className={`flex items-center justify-between px-3.5 py-3 rounded-xl border mb-2 cursor-pointer transition-all ${
            i === 0
              ? 'border-olive bg-olive-bg hover:border-olive-dark'
              : 'border-off2 hover:border-olive-border hover:bg-olive-bg'
          }`}
        >
          <div>
            <div className="text-[13px] font-medium text-text">
              {offer.retailer.name}
              {i === 0 && (
                <span className="text-[10px] bg-olive text-white px-[7px] py-0.5 rounded-full font-semibold ml-1.5">
                  Nejlevněji
                </span>
              )}
            </div>
            {i === 0 && (
              <div className="text-[11px] text-olive-light mt-0.5">Doručení dnes</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-base font-semibold text-text">{formatPrice(offer.price)}</div>
            <div className="text-[11px] text-text3">{formatPricePer100ml(offer.price, volumeMl)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
