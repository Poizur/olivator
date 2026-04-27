import Link from 'next/link'
import { getAllProductsAdmin } from '@/lib/data'
import { countryFlag, typeLabel, extractBrand } from '@/lib/utils'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; brand?: string }>
}) {
  const { status, brand } = await searchParams

  // Fetch all products (no status filter) for global brand list + counts
  const allProducts = await getAllProductsAdmin()

  // Apply filters client-side using single DB fetch
  let filtered = [...allProducts]
  if (status) filtered = filtered.filter(p => p.status === status)
  if (brand) filtered = filtered.filter(p => extractBrand(p.name) === brand)

  const statusCounts = {
    all: allProducts.length,
    active: allProducts.filter(p => p.status === 'active').length,
    draft: allProducts.filter(p => p.status === 'draft').length,
    inactive: allProducts.filter(p => p.status === 'inactive').length,
  }

  // Brand list with counts (respecting current status filter)
  const brandSource = status
    ? allProducts.filter(p => p.status === status)
    : allProducts
  const brandCounts = new Map<string, number>()
  for (const p of brandSource) {
    const b = extractBrand(p.name)
    brandCounts.set(b, (brandCounts.get(b) ?? 0) + 1)
  }
  const brands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1])

  function statusHref(value?: string) {
    const p = new URLSearchParams()
    if (value) p.set('status', value)
    if (brand) p.set('brand', brand)
    const qs = p.toString()
    return qs ? `/admin/products?${qs}` : '/admin/products'
  }
  function brandHref(value?: string) {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (value) p.set('brand', value)
    const qs = p.toString()
    return qs ? `/admin/products?${qs}` : '/admin/products'
  }

  const statusFilters = [
    { value: undefined, label: `Vše (${statusCounts.all})` },
    { value: 'active', label: `Aktivní (${statusCounts.active})` },
    { value: 'draft', label: `Drafty (${statusCounts.draft})` },
    { value: 'inactive', label: `Neaktivní (${statusCounts.inactive})` },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Produkty</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/products/import"
            className="bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-olive-dark transition-colors"
          >
            📥 Import z URL
          </Link>
        </div>
      </div>

      {/* Status filter row */}
      <div className="mb-3">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-1.5">Stav</div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(f => {
            const active = status === f.value || (!status && !f.value)
            return (
              <Link
                key={f.label}
                href={statusHref(f.value)}
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
      </div>

      {/* Brand filter row */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-1.5">Výrobce</div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={brandHref(undefined)}
            className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
              !brand
                ? 'bg-olive text-white'
                : 'bg-white border border-off2 text-text2 hover:border-olive-light hover:text-olive'
            }`}
          >
            Všichni
          </Link>
          {brands.map(([b, count]) => (
            <Link
              key={b}
              href={brandHref(b)}
              className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
                brand === b
                  ? 'bg-olive text-white'
                  : 'bg-white border border-off2 text-text2 hover:border-olive-light hover:text-olive'
              }`}
            >
              {b} ({count})
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-off">
            <tr>
              <th className="px-3 py-3 w-[56px]"></th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Produkt</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Výrobce</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3 whitespace-nowrap">EAN</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Typ</th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Score</th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3 whitespace-nowrap">Kyselost</th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Stav</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-text3 text-sm">
                  Žádné produkty neodpovídají vybraným filtrům
                </td>
              </tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-t border-off hover:bg-off/50">
                <td className="px-3 py-2">
                  <Link href={`/admin/products/${p.id}`} className="block w-10 h-10 bg-off rounded overflow-hidden border border-off2">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-base">🫒</div>
                    )}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm font-medium text-text">
                    {countryFlag(p.originCountry)} {p.name}
                  </div>
                  <div className="text-xs text-text3">
                    {p.originRegion}{p.volumeMl ? ` · ${p.volumeMl} ml` : ''}
                  </div>
                </td>
                <td className="px-3 py-3 text-xs text-text2">
                  {extractBrand(p.name)}
                </td>
                <td className="px-3 py-3 text-xs text-text2 font-mono whitespace-nowrap">
                  {p.ean ?? <span className="text-text3 italic">—</span>}
                </td>
                <td className="px-3 py-3 text-xs text-text2">{typeLabel(p.type)}</td>
                <td className="px-3 py-3 text-right">
                  <span className="text-sm font-semibold text-terra tabular-nums">
                    {p.olivatorScore || '—'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-sm text-text tabular-nums whitespace-nowrap">
                  {p.acidity ? `${p.acidity}%` : '—'}
                </td>
                <td className="px-3 py-3 text-center">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="text-[12px] text-olive hover:text-olive-dark whitespace-nowrap"
                  >
                    Upravit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-text3">
        Zobrazeno {filtered.length} z {allProducts.length} produktů
        {brand && <> &middot; výrobce: <strong>{brand}</strong></>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="text-[11px] bg-olive-bg text-olive-dark px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-block">
        ● aktivní
      </span>
    )
  }
  if (status === 'draft') {
    return (
      <span className="text-[11px] bg-terra-bg text-terra px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-block">
        ○ draft
      </span>
    )
  }
  return (
    <span className="text-[11px] bg-off text-text3 px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-block">
      ○ neaktivní
    </span>
  )
}
