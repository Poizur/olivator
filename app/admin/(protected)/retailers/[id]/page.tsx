import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRetailerFullById } from '@/lib/data'
import { RetailerForm } from '../retailer-form'
import { FeedSyncPanel } from '../feed-sync-panel'

export default async function EditRetailerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const retailer = await getRetailerFullById(id)
  if (!retailer) notFound()

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
      <RetailerForm initial={retailer} />
    </div>
  )
}
