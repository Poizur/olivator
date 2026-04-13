'use client'

import { useCompare } from '@/lib/compare-context'
import type { Product } from '@/lib/types'

export function ProductActions({ product }: { product: Product }) {
  const { addItem, removeItem, isInCompare } = useCompare()
  const inCompare = isInCompare(product.id)

  return (
    <button
      onClick={() => inCompare ? removeItem(product.id) : addItem(product)}
      className={`w-full rounded-xl py-3.5 text-[15px] font-medium cursor-pointer transition-all border-[1.5px] ${
        inCompare
          ? 'bg-olive text-white border-olive'
          : 'bg-off text-text border-off2 hover:bg-off2'
      }`}
    >
      {inCompare ? '✓ V porovnání' : '+ Přidat do porovnání'}
    </button>
  )
}
