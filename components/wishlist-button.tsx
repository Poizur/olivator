'use client'

import { useWishlist } from '@/lib/wishlist-context'

interface Props {
  productId: string
  className?: string
}

export function WishlistButton({ productId, className = '' }: Props) {
  const { isWishlisted, toggle } = useWishlist()
  const active = isWishlisted(productId)

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(productId)
      }}
      aria-label={active ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
      title={active ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
      className={`transition-all ${className}`}
    >
      <span className={`text-lg leading-none ${active ? 'text-red-500' : 'text-text3 hover:text-red-400'}`}>
        {active ? '♥' : '♡'}
      </span>
    </button>
  )
}
