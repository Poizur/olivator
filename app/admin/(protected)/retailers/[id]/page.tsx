import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRetailerFullById } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'
import { RetailerForm } from '../retailer-form'
import { FeedSyncPanel } from '../feed-sync-panel'

async function getRetailerPhotos(retailerId: string) {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('id, url, alt_text, is_primary, sort_order, source, source_attribution, width, height')
    .eq('entity_id', retailerId)
    .eq('entity_type', 'retailer')
    .eq('status', 'active')
    .order('sort_order')
  return data ?? []
}

export default async function EditRetailerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const retailer = await getRetailerFullById(id)
  if (!retailer) notFound()

  const photos = await getRetailerPhotos(retailer.id)

  return (
    <div>
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/retailers" className="text-olive">Prodejci</Link>
        {' › '}
        {retailer.name}
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-6">
        {retailer.name}
      </h1>
      <FeedSyncPanel
        retailerId={retailer.id}
        retailerName={retailer.name}
        xmlFeedUrl={retailer.xmlFeedUrl ?? null}
        xmlFeedFormat={retailer.xmlFeedFormat ?? null}
        xmlFeedLastSynced={retailer.xmlFeedLastSynced ?? null}
        xmlFeedLastResult={retailer.xmlFeedLastResult}
      />
      <RetailerForm initial={retailer} initialPhotos={photos} />
    </div>
  )
}
