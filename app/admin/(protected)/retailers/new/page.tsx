import Link from 'next/link'
import { RetailerForm } from '../retailer-form'

export default function NewRetailerPage() {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/retailers" className="text-olive">Prodejci</Link>
        {' › Nový'}
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white mb-6">
        Nový prodejce
      </h1>
      <RetailerForm />
    </div>
  )
}
