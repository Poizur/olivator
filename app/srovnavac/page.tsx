import { Suspense } from 'react'
import { getProductsWithOffers, getSiteStats } from '@/lib/data'
import { ListingContent } from './listing-content'

export const metadata = {
  title: 'Srovnávač olivových olejů',
  description: 'Porovnejte olivové oleje. Filtry podle typu, původu, certifikace a ceny.',
}

export default async function SrovnavacPage() {
  const [products, stats] = await Promise.all([
    getProductsWithOffers(),
    getSiteStats(),
  ])
  const counts = {
    types: stats.byType,
    origins: stats.byOrigin,
    certifications: stats.byCertification,
  }
  return (
    <Suspense fallback={<div className="p-10 text-center text-text3">Načítání...</div>}>
      <ListingContent products={products} counts={counts} />
    </Suspense>
  )
}
