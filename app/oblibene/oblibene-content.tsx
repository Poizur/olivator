'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWishlist } from '@/lib/wishlist-context'
import { formatPrice, formatPricePer100ml } from '@/lib/utils'
import { WishlistButton } from '@/components/wishlist-button'
import { ScoreBadge } from '@/components/score-badge'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

interface Props {
  allProducts: ProductWithOffer[]
}

export function OblibeneContent({ allProducts }: Props) {
  const { ids } = useWishlist()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return (
      <div className="text-center py-16 text-text3 text-sm">Načítám oblíbené…</div>
    )
  }

  const wishlisted = allProducts.filter((p) => ids.has(p.id))

  if (wishlisted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">♡</div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-text mb-2">
          Zatím žádné oblíbené
        </h2>
        <p className="text-text3 text-sm mb-6 max-w-[360px] mx-auto">
          Na každé produktové kartě klikni na ♡ — olej se uloží sem. Funguje bez přihlášení.
        </p>
        <Link
          href="/srovnavac"
          className="inline-block px-6 py-2.5 rounded-full text-sm font-semibold bg-olive text-white hover:bg-olive2 transition-colors"
        >
          Prohlédnout oleje
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {wishlisted.map((p) => {
        const offer = p.cheapestOffer
        return (
          <div
            key={p.id}
            className="bg-white border border-off2 rounded-[var(--radius-card)] p-4 flex flex-col"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <Link href={`/olej/${p.slug}`} className="flex-1">
                <div className="text-sm font-semibold text-text hover:text-olive leading-snug">
                  {p.name}
                </div>
                <div className="text-[11px] text-text3 mt-0.5">
                  {p.type === 'flavored'
                    ? <span className="text-terra font-bold uppercase tracking-wider text-[10px]">Aromatizovaný</span>
                    : p.olivatorScore != null && p.olivatorScore > 0
                      ? <>Score {p.olivatorScore}</>
                      : <>Score —</>}
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <ScoreBadge score={p.olivatorScore} type={p.type} size="small" />
                <WishlistButton productId={p.id} />
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-off flex items-center justify-between">
              <div>
                {offer ? (
                  <>
                    <span className="text-sm font-semibold text-text">{formatPrice(offer.price)}</span>
                    {p.volumeMl > 0 && (
                      <div className="text-[11px] text-text3">
                        {formatPricePer100ml(offer.price, p.volumeMl)}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[12px] text-text3">Bez nabídky</span>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/olej/${p.slug}`}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-olive/30 text-olive hover:bg-olive-bg transition-colors"
                >
                  Detail
                </Link>
                {offer && (
                  <Link
                    href={`/go/${offer.retailer.slug}/${p.slug}`}
                    target="_blank"
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-olive text-white hover:bg-olive2 transition-colors"
                  >
                    Koupit
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
