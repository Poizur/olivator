import { Suspense } from 'react'
import { getProductsWithOffers } from '@/lib/data'
import { ListingContent } from './listing-content'

export const metadata = {
  title: 'Srovnávač olivových olejů',
  description: 'Porovnejte olivové oleje. Filtry podle typu, původu, certifikace a ceny.',
}

export default async function SrovnavacPage() {
  const products = await getProductsWithOffers()
  return (
    <Suspense fallback={<div className="p-10 text-center text-text3">Načítání...</div>}>
      <ListingContent products={products} />
    </Suspense>
  )
}
