import type { Metadata } from 'next'
import { getProductsWithOffers } from '@/lib/data'
import { OblibeneContent } from './oblibene-content'

export const metadata: Metadata = {
  title: 'Oblíbené oleje',
  description: 'Tvoje uložené olivové oleje — bez přihlášení, uloženo v prohlížeči.',
  robots: { index: false, follow: false },
}

// 1h cache. Bez ní každý uživatel = full katalog ze Supabase. Filter probíhá
// client-side podle localStorage IDs, takže fresh fetched stejně potřebujeme.
export const revalidate = 3600

export default async function OblibbenePage() {
  const products = await getProductsWithOffers()

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-10">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-normal text-text mb-2">
          Oblíbené oleje
        </h1>
        <p className="text-sm text-text3">
          Uloženo v prohlížeči · bez přihlášení
        </p>
      </div>

      <OblibeneContent allProducts={products} />
    </div>
  )
}
