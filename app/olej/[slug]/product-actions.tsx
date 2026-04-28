'use client'

import { useCompare } from '@/lib/compare-context'
import { useWishlist } from '@/lib/wishlist-context'
import type { Product } from '@/lib/types'

export function ProductActions({ product }: { product: Product }) {
  const { addItem, removeItem, isInCompare } = useCompare()
  const { toggle, isWishlisted } = useWishlist()
  const inCompare = isInCompare(product.id)
  const wishlisted = isWishlisted(product.id)

  return (
    <div className="flex gap-2">
      <button
        onClick={() => inCompare ? removeItem(product.id) : addItem(product)}
        className={`flex-1 rounded-xl py-3.5 text-[15px] font-medium cursor-pointer transition-all border-[1.5px] ${
          inCompare
            ? 'bg-olive text-white border-olive'
            : 'bg-off text-text border-off2 hover:bg-off2'
        }`}
      >
        {inCompare ? '✓ V porovnání' : '+ Přidat do porovnání'}
      </button>
      <button
        onClick={() => toggle(product.id)}
        aria-label={wishlisted ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
        title={wishlisted ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
        className={`w-12 rounded-xl border-[1.5px] flex items-center justify-center text-xl transition-all ${
          wishlisted
            ? 'border-red-300 bg-red-50 text-red-500'
            : 'border-off2 bg-off text-text3 hover:text-red-400 hover:border-red-200'
        }`}
      >
        {wishlisted ? '♥' : '♡'}
      </button>
    </div>
  )
}
