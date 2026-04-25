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
import { StatusActions } from './status-actions'

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
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">
          {productRow.name as string}
        </h1>
        <StatusActions
          productId={id}
          currentStatus={status}
          publicUrl={publicUrl}
        />
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
