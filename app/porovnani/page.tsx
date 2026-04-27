import { Suspense } from 'react'
import { getProductsWithOffers } from '@/lib/data'
import { ComparatorContent } from './comparator-content'

export const metadata = {
  title: 'Olej proti oleji — porovnávač | Olivator',
  description: 'Postav 2–5 olivových olejů vedle sebe. Olivator Score, kyselost, polyfenoly, cena za 100 ml. Bez marketingu.',
}

export default async function ComparatorPage() {
  const allProducts = await getProductsWithOffers()
  return (
    <Suspense fallback={<div className="p-10 text-center text-text3">Načítání...</div>}>
      <ComparatorContent allProducts={allProducts} />
    </Suspense>
  )
}
