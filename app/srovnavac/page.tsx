import { Suspense } from 'react'
import { getProductsWithOffers, getSiteStats } from '@/lib/data'
import { ListingContent } from './listing-content'

export const metadata = {
  title: 'Katalog olivových olejů',
  description: 'Procházejte všechny olivové oleje. Filtry podle typu, původu, certifikace a ceny.',
  // Explicit canonical — query string varianty (?origin=GR&type=evoo) by jinak
  // mohly být brány jako duplicate content. Konsoliduje page authority.
  alternates: { canonical: 'https://olivator.cz/srovnavac' },
}

// Bez revalidate by každý bot fetch = celý katalog ze Supabase. 1h cache:
// produkty se vidí max 1h zpožděně po admin update — ceny scrapuje
// cron:discovery 1×/den, takže žádný real-time data loss.
export const revalidate = 3600

export default async function SrovnavacPage() {
  const [products, stats] = await Promise.all([
    getProductsWithOffers(),
    getSiteStats(),
  ])
  const counts = {
    types: stats.byType,
    origins: stats.byOrigin,
    certifications: stats.byCertification,
    highPolyphenols: stats.highPolyphenols,
    highOleocanthal: stats.highOleocanthal,
  }
  return (
    <Suspense fallback={<div className="p-10 text-center text-text3">Načítání...</div>}>
      <ListingContent products={products} counts={counts} />
    </Suspense>
  )
}
