import Link from 'next/link'
import { ImportForm } from './import-form'

export default function ImportPage() {
  return (
    <div>
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/products" className="text-olive">Produkty</Link>
        {' › Import z URL'}
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-2">
        Import produktu z URL
      </h1>
      <p className="text-sm text-text2 font-light mb-6 max-w-2xl">
        Vlož URL produktu z e-shopu (Rohlík, Košík, olivio.cz, reckonasbavi.cz…).
        Systém stáhne název, EAN, fotku, cenu a specs, pre-vyplní formulář a ty
        zkontroluješ před uložením.
      </p>
      <ImportForm />
    </div>
  )
}
