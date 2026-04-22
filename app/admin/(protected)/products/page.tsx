import Link from 'next/link'
import { getAllProductsAdmin } from '@/lib/data'
import { countryFlag, typeLabel } from '@/lib/utils'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const products = await getAllProductsAdmin(status)

  const statusCounts = {
    all: (await getAllProductsAdmin()).length,
    active: (await getAllProductsAdmin('active')).length,
    draft: (await getAllProductsAdmin('draft')).length,
    inactive: (await getAllProductsAdmin('inactive')).length,
  }

  const filters = [
    { value: undefined, label: `Vše (${statusCounts.all})` },
    { value: 'active', label: `Aktivní (${statusCounts.active})` },
    { value: 'draft', label: `Drafty (${statusCounts.draft})` },
    { value: 'inactive', label: `Neaktivní (${statusCounts.inactive})` },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Produkty</h1>
      </div>

      <div className="flex gap-2 mb-5">
        {filters.map(f => {
          const active = status === f.value || (!status && !f.value)
          const href = f.value ? `/admin/products?status=${f.value}` : '/admin/products'
          return (
            <Link
              key={f.label}
              href={href}
              className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
                active
                  ? 'bg-olive text-white'
                  : 'bg-white border border-off2 text-text2 hover:border-olive-light hover:text-olive'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-off">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Produkt</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">EAN</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Typ</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Score</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Kyselost</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Stav</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text3 text-sm">
                  Žádné produkty
                </td>
              </tr>
            )}
            {products.map(p => (
              <tr key={p.id} className="border-t border-off hover:bg-off/50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-text">
                    {countryFlag(p.originCountry)} {p.name}
                  </div>
                  <div className="text-xs text-text3">
                    {p.originRegion}{p.volumeMl ? ` · ${p.volumeMl} ml` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-text2 font-mono">{p.ean}</td>
                <td className="px-4 py-3 text-xs text-text2">{typeLabel(p.type)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-terra tabular-nums">
                    {p.olivatorScore || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-text tabular-nums">
                  {p.acidity ? `${p.acidity}%` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="text-[12px] text-olive hover:text-olive-dark"
                  >
                    Upravit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="text-[11px] bg-olive-bg text-olive-dark px-2 py-0.5 rounded-full font-medium">
        ● aktivní
      </span>
    )
  }
  if (status === 'draft') {
    return (
      <span className="text-[11px] bg-terra-bg text-terra px-2 py-0.5 rounded-full font-medium">
        ○ draft
      </span>
    )
  }
  return (
    <span className="text-[11px] bg-off text-text3 px-2 py-0.5 rounded-full font-medium">
      ○ neaktivní
    </span>
  )
}
