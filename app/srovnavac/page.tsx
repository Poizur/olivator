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

// force-dynamic: stránka renderována na request (ne SSG).
// Důvod: SSG při buildu volá getProductsWithOffers() — pokud Supabase vrátí
// poškozená data (bad JSONB), build padá. force-dynamic to eliminuje.
// Cena: každý request = 1 Supabase query, ale katalog je interaktivní stránka
// s filtry, takže cached snapshot by stejně nebyl ideální.
export const dynamic = 'force-dynamic'

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

  // ItemList JSON-LD pro top 50 produktů dle Score — Google rozliší katalog
  // od ranking/listing. Bez ItemList Google neví, že je to vybraný seznam,
  // jen vidí HTML linky. Top 50 stačí: víc položek = bloated schema bez
  // přidaného hodnoty (Google stejně bere jen prvních ~30).
  const topProducts = [...products]
    .filter((p) => p.olivatorScore != null && p.olivatorScore > 0)
    .sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))
    .slice(0, 50)

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Katalog olivových olejů — Olivátor',
    description: `${products.length} olivových olejů seřazených dle Olivator Score.`,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: topProducts.length,
    itemListElement: topProducts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://olivator.cz/olej/${p.slug}`,
      name: p.name,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <Suspense fallback={<div className="p-10 text-center text-text3">Načítání...</div>}>
        <ListingContent products={products} counts={counts} />
      </Suspense>
    </>
  )
}
