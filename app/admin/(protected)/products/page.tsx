import Link from 'next/link'
import { getAllProductsAdmin } from '@/lib/data'
import { typeLabel, extractBrand } from '@/lib/utils'
import { calculateCompleteness, completenessColor } from '@/lib/completeness'
import { BulkRescrapeButton } from './bulk-rescrape-button'
import { BackfillDraftsButton } from './backfill-drafts-button'
import { StatusBadge as SharedStatusBadge } from '@/components/admin/status-badge'
import { StatusFilters } from '@/components/admin/status-filters'

function CompletenessBadge({ result }: { result: ReturnType<typeof calculateCompleteness> }) {
  const { bg, text } = completenessColor(result.weightedPercent)
  const tooltip = result.missing.length > 0
    ? `Chybí: ${result.missing.map((m) => m.label).join(', ')}`
    : 'Vše vyplněno'
  return (
    <span
      className={`text-[11px] ${bg} ${text} px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-block`}
      title={tooltip}
    >
      {result.weightedPercent}%
    </span>
  )
}

// Re-export shared component pod stejným jménem aby zbytek souboru fungoval beze změn
const StatusBadge = SharedStatusBadge

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; brand?: string; sort?: string }>
}) {
  const { status, brand, sort } = await searchParams

  // Fetch all products (no status filter) for global brand list + counts
  const allProducts = await getAllProductsAdmin()

  // Pre-compute completeness for each product (used in badge + sort)
  const withCompleteness = allProducts.map((p) => ({ ...p, _completeness: calculateCompleteness(p) }))

  // Apply filters client-side using single DB fetch
  let filtered = [...withCompleteness]
  if (status) filtered = filtered.filter(p => p.status === status)
  if (brand) filtered = filtered.filter(p => extractBrand(p.name) === brand)

  // Sort: default = newest, ?sort=completeness = worst first (admin sees gaps to fix)
  if (sort === 'completeness') {
    filtered.sort((a, b) => a._completeness.weightedPercent - b._completeness.weightedPercent)
  }

  const statusCounts = {
    all: allProducts.length,
    active: allProducts.filter(p => p.status === 'active').length,
    draft: allProducts.filter(p => p.status === 'draft').length,
    inactive: allProducts.filter(p => p.status === 'inactive').length,
    excluded: allProducts.filter(p => p.status === 'excluded').length,
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

  function brandHref(value?: string) {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (value) p.set('brand', value)
    const qs = p.toString()
    return qs ? `/admin/products?${qs}` : '/admin/products'
  }

  const showBulkRescrape = status === 'draft' && statusCounts.draft > 0

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Produkty</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/products/import"
            className="bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-olive2 transition-colors"
          >
            Import z URL
          </Link>
        </div>
      </div>

      {showBulkRescrape && (
        <>
          <BackfillDraftsButton draftCount={statusCounts.draft} />
          <div className="bg-olive-bg/30 border border-olive-border rounded-xl p-4 mb-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-olive-dark">
                ✨ Drafty čekají na zpracování
              </div>
              <p className="text-[12px] text-olive-dark/80 mt-0.5 leading-snug">
                Spusť plnou AI pipeline (scrape + fakta + popisy + Score + galerie + lab scan) pro všechny — pak už jen zkontroluješ a publikuješ.
              </p>
            </div>
            <BulkRescrapeButton draftCount={statusCounts.draft} />
          </div>
        </>
      )}

      <StatusFilters
        active={status}
        basePath="/admin/products"
        preserveQuery={{ brand }}
        options={[
          { value: undefined, label: 'Vše', count: statusCounts.all },
          { value: 'active', label: 'Aktivní', count: statusCounts.active },
          { value: 'draft', label: 'Drafty', count: statusCounts.draft },
          { value: 'inactive', label: 'Neaktivní', count: statusCounts.inactive },
          { value: 'excluded', label: 'Vyřazené', count: statusCounts.excluded },
        ]}
      />

      {/* Brand filter row */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-1.5">Výrobce</div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={brandHref(undefined)}
            className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
              !brand
                ? 'bg-olive text-white'
                : 'bg-white border border-off2 text-text2 hover:border-olive3 hover:text-olive'
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
                  : 'bg-white border border-off2 text-text2 hover:border-olive3 hover:text-olive'
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
              <th className="text-center px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">
                <Link
                  href={sort === 'completeness' ? '/admin/products' : '/admin/products?sort=completeness'}
                  className={`hover:text-olive transition-colors ${sort === 'completeness' ? 'text-olive' : ''}`}
                  title="Kliknutím seřadit od nejvíce neúplných"
                >
                  Komplet {sort === 'completeness' ? '↑' : '↕'}
                </Link>
              </th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Stav</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-text3 text-sm">
                  Žádné produkty neodpovídají vybraným filtrům
                </td>
              </tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-t border-off2 hover:bg-off/60">
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
                      <div className="w-full h-full flex items-center justify-center font-[family-name:var(--font-display)] text-base italic text-text3/40">{p.name.charAt(0)}</div>
                    )}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm font-medium text-text">
                    {p.name}
                  </div>
                  <div className="text-xs text-text3">
                    {p.originRegion}{p.volumeMl ? ` · ${p.volumeMl} ml` : ''}
                  </div>
                  {(p.status === 'inactive' || p.status === 'excluded') && (p.statusReasonCode || p.statusReasonNote) && (
                    <div className={`mt-1 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded ${p.status === 'excluded' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                      <span>{p.statusChangedBy === 'auto' ? '🤖' : '👤'}</span>
                      <span>
                        {p.statusReasonCode === 'url_404' && 'URL nedostupné'}
                        {p.statusReasonCode === 'out_of_stock' && 'Vyprodáno'}
                        {p.statusReasonCode === 'duplicate' && 'Duplikát'}
                        {p.statusReasonCode === 'low_quality' && 'Málo dat'}
                        {p.statusReasonCode === 'wrong_category' && 'Špatná kategorie'}
                        {p.statusReasonCode === 'price_anomaly' && 'Cenová anomálie'}
                        {p.statusReasonCode === 'not_interesting' && 'Mimo fokus'}
                        {p.statusReasonCode === 'custom' && (p.statusReasonNote ?? 'Vlastní')}
                        {!p.statusReasonCode && p.statusReasonNote}
                      </span>
                      {p.statusReasonNote && p.statusReasonCode && p.statusReasonCode !== 'custom' && (
                        <span className="opacity-70">· {p.statusReasonNote}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-text2">
                  {extractBrand(p.name)}
                </td>
                <td className="px-3 py-3 text-xs text-text2 font-mono whitespace-nowrap">
                  {p.ean ?? <span className="text-text3 italic">—</span>}
                </td>
                <td className="px-3 py-3 text-xs text-text2">{typeLabel(p.type)}</td>
                <td className="px-3 py-3 text-right">
                  <span className="text-sm font-semibold text-amber-700 tabular-nums">
                    {p.olivatorScore || '—'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-sm text-text tabular-nums whitespace-nowrap">
                  {p.acidity ? `${p.acidity}%` : '—'}
                </td>
                <td className="px-3 py-3 text-center">
                  <CompletenessBadge result={p._completeness} />
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
