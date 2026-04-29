import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRetailerFullById } from '@/lib/data'
import { RetailerForm } from '../retailer-form'

export default async function EditRetailerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const retailer = await getRetailerFullById(id)
  if (!retailer) notFound()

  return (
    <div>
      <div className="text-xs text-zinc-500 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/retailers" className="text-olive">Prodejci</Link>
        {' › '}
        {retailer.name}
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white mb-6">
        {retailer.name}
      </h1>
      <RetailerForm initial={retailer} />
    </div>
  )
}
