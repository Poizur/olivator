'use client'

// Sticky Buy Bar — desktopové floating CTA, viditelné po scroll past hero.
// Apple-styled pill (rounded-full, backdrop-blur, jemný stín). Skryté na
// mobile (mobile už má vlastní compare bar dole). Zobrazí se až po
// vertikálním scrollu > 600px aby nepřebíjelo hero.

import { useEffect, useState } from 'react'
import { AffiliateLink } from './affiliate-link'
import { formatPrice } from '@/lib/utils'

interface Props {
  productSlug: string
  productName: string
  retailerSlug: string
  retailerName: string
  price: number
  scoreBadge?: { value: number | null; type: string | null }
}

export function StickyBuyBar({
  productSlug,
  productName,
  retailerSlug,
  retailerName,
  price,
  scoreBadge,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const showScore =
    scoreBadge && scoreBadge.value != null && scoreBadge.value > 0 && scoreBadge.type !== 'flavored'

  return (
    <div
      aria-hidden={!visible}
      className={`hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-3 bg-white/95 backdrop-blur-md border border-off2 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.12)] pl-2 pr-2 py-2 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      {showScore && (
        <div className="flex items-center gap-1.5 pl-3 pr-2 py-1 bg-[var(--terra)]/10 rounded-full">
          <svg width="11" height="11" fill="var(--terra)" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-[12px] font-bold text-[var(--terra)] tabular-nums">
            {scoreBadge!.value}
          </span>
        </div>
      )}
      <div className="flex flex-col leading-tight px-2">
        <span className="text-[10px] uppercase tracking-wider text-text3 font-semibold">
          Nejlevněji
        </span>
        <span className="text-[15px] font-bold text-text tabular-nums">{formatPrice(price)}</span>
      </div>
      <AffiliateLink
        data={{
          productSlug,
          productName,
          retailerSlug,
          retailerName,
          price,
          source: 'product_page',
        }}
        className="inline-flex items-center gap-1.5 bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-olive-dark transition-colors whitespace-nowrap"
      >
        Koupit u {retailerName}
        <span className="text-[11px]">→</span>
      </AffiliateLink>
    </div>
  )
}
