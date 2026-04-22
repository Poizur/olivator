import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllRetailers, getOffersForProduct } from '@/lib/data'
import { ProductForm } from './product-form'
import { OffersManager } from './offers-manager'
import { ImagePanel } from './image-panel'

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

  return (
    <div>
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/products" className="text-olive">Produkty</Link>
        {' › '}
        {productRow.name as string}
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-6">
        {productRow.name as string}
      </h1>

      <div className="space-y-6">
        <ImagePanel
          productId={id}
          currentImageUrl={(productRow.image_url as string) ?? null}
          currentSource={(productRow.image_source as string) ?? null}
          ean={productRow.ean as string}
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
