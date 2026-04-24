import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllRetailers, getOffersForProduct } from '@/lib/data'
import { ProductForm } from './product-form'
import { OffersManager } from './offers-manager'
import { ImagePanel } from './image-panel'
import { FactsPanel, type ExtractedFact } from './facts-panel'
import { SourcePanel } from './source-panel'
import { GalleryManager } from './gallery-manager'

async function getProductRow(id: string) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [productRow, retailers] = await Promise.all([
    getProductRow(id),
    getAllRetailers(),
  ])
  if (!productRow) notFound()

  const offers = await getOffersForProduct(id)

  const status = productRow.status as string
  const isPublic = status === 'active'
  const publicUrl = `/olej/${productRow.slug as string}`

  return (
    <div>
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/products" className="text-olive">Produkty</Link>
        {' › '}
        {productRow.name as string}
      </div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">
            {productRow.name as string}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span
              className={`inline-block px-2 py-0.5 rounded-full font-medium ${
                status === 'active'
                  ? 'bg-olive-bg text-olive-dark border border-olive-border'
                  : status === 'draft'
                  ? 'bg-terra-bg text-terra border border-terra/30'
                  : 'bg-off border border-off2 text-text2'
              }`}
            >
              {status === 'active' ? '● Aktivní na webu' : status === 'draft' ? '○ Draft' : '◌ Neaktivní'}
            </span>
            {!isPublic && (
              <span className="text-text3 text-[11px]">
                {status === 'draft'
                  ? '— přepni status na "Aktivní" aby byl produkt na webu'
                  : '— není zobrazen na webu'}
              </span>
            )}
          </div>
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark transition-colors"
          title={isPublic ? 'Otevřít produkt na webu (nové okno)' : 'Produkt není aktivní — uvidíš náhled, ale pro veřejnost není dostupný'}
        >
          👁 Zobrazit na webu
          <span className="text-[11px] opacity-70">↗</span>
        </a>
      </div>

      <div className="space-y-6">
        <SourcePanel
          productId={id}
          sourceUrl={(productRow.source_url as string | null) ?? null}
          rawDescriptionLength={((productRow.raw_description as string | null) ?? '').length}
        />
        <ImagePanel
          productId={id}
          currentImageUrl={(productRow.image_url as string) ?? null}
          currentSource={(productRow.image_source as string) ?? null}
          ean={productRow.ean as string}
        />
        <GalleryManager productId={id} />
        <FactsPanel
          productId={id}
          initialFacts={
            Array.isArray(productRow.extracted_facts)
              ? (productRow.extracted_facts as ExtractedFact[])
              : []
          }
        />
        <ProductForm
          productRow={productRow}
          cheapestOfferPrice={offers[0]?.price ?? null}
        />
        <OffersManager
          productId={id}
          productSlug={productRow.slug as string}
          retailers={retailers}
          initialOffers={offers}
        />
      </div>
    </div>
  )
}
