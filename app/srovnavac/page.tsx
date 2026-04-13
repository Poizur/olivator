import { Suspense } from 'react'
import { ListingContent } from './listing-content'

export const metadata = {
  title: 'Srovnávač olivových olejů',
  description: 'Porovnejte 582 olivových olejů. Filtry podle typu, původu, certifikace a ceny.',
}

export default function SrovnavacPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-text3">Načítání...</div>}>
      <ListingContent />
    </Suspense>
  )
}
