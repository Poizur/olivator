import Link from 'next/link'
import { getAllProductsAdmin } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateCompleteness } from '@/lib/completeness'
import { BulkRescrapeButton } from './bulk-rescrape-button'
import { BackfillDraftsButton } from './backfill-drafts-button'
import { ProductsBulkTable } from './products-bulk-table'
import { StatusFilters } from '@/components/admin/status-filters'

// Sentinel pro produkty bez brand_slug (zatím nezařazené do žádné značky)
const NO_BRAND = '__none__'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; brand?: string; sort?: string }>
}) {
  const { status, brand, sort } = await searchParams

  // Fetch all products (no status filter) for global brand list + counts
  const allProducts = await getAllProductsAdmin()

  // Načti brand_slug + brand display names — vyhneme se name parsingu (extractBrand)
  // který produkoval falešné "značky" jako "Extra", "Picual", "8", "Dárkové".
  // Mapa: product.id → { slug, name } z brands tabulky.
  const productIds = allProducts.map(p => p.id)
  const [brandSlugMapResult, brandsResult] = await Promise.all([
    supabaseAdmin.from('products').select('id, brand_slug').in('id', productIds),
    supabaseAdmin.from('brands').select('slug, name').order('name'),
  ])
  const productBrandSlug = new Map<string, string | null>(
    (brandSlugMapResult.data ?? []).map((r) => [r.id as string, r.brand_slug as string | null])
  )
  const brandNameBySlug = new Map<string, string>(
    (brandsResult.data ?? []).map((b) => [b.slug as string, b.name as string])
  )

  // Pre-compute completeness for each product (used in badge + sort)
  const withCompleteness = allProducts.map((p) => ({
    ...p,
    _completeness: calculateCompleteness(p),
    _brandSlug: productBrandSlug.get(p.id) ?? null,
  }))

  // Apply filters client-side using single DB fetch
  let filtered = [...withCompleteness]
  if (status) filtered = filtered.filter(p => p.status === status)
  if (brand) {
    if (brand === NO_BRAND) filtered = filtered.filter(p => !p._brandSlug)
    else filtered = filtered.filter(p => p._brandSlug === brand)
  }

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
    ? withCompleteness.filter(p => p.status === status)
    : withCompleteness
  const brandCounts = new Map<string, number>()
  let noBrandCount = 0
  for (const p of brandSource) {
    if (!p._brandSlug) {
      noBrandCount++
      continue
    }
    brandCounts.set(p._brandSlug, (brandCounts.get(p._brandSlug) ?? 0) + 1)
  }
  // [slug, count, displayLabel]
  const brands: Array<[string, number, string]> = [...brandCounts.entries()]
    .map(([slug, count]) => [slug, count, brandNameBySlug.get(slug) ?? slug] as [string, number, string])
    .sort((a, b) => b[1] - a[1])

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
          {/* Pokročilé: plný rescrape přes Playwright. Skryto pod expanderem —
              běžný workflow je Backfill (rychlejší, levnější, řeší 95 % případů).
              Rescrape jen když chceš nové lab data nebo retailer změnil web. */}
          <details className="mb-3 group">
            <summary className="text-[12px] text-text3 cursor-pointer hover:text-text px-1 select-none">
              ⚙️ Pokročilé: Plný rescrape přes Playwright
            </summary>
            <div className="bg-off/40 border border-off2 rounded-xl p-4 mt-2 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-text2">
                  Plná AI pipeline od nuly
                </div>
                <p className="text-[11px] text-text3 mt-0.5 leading-snug">
                  Znovu projde URL produktu, vytáhne kompletní data (price, lab parametry, galerii, EAN), vygeneruje všechny AI popisy. ~30-60 s/draft, $0,05/draft. Použij když retailer změnil web nebo chceš obnovit lab data.
                </p>
              </div>
              <BulkRescrapeButton draftCount={statusCounts.draft} />
            </div>
          </details>
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
          {brands.map(([slug, count, label]) => (
            <Link
              key={slug}
              href={brandHref(slug)}
              className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
                brand === slug
                  ? 'bg-olive text-white'
                  : 'bg-white border border-off2 text-text2 hover:border-olive3 hover:text-olive'
              }`}
            >
              {label} ({count})
            </Link>
          ))}
          {noBrandCount > 0 && (
            <Link
              href={brandHref(NO_BRAND)}
              className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
                brand === NO_BRAND
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 border border-amber-200 text-amber-700 hover:border-amber-400'
              }`}
              title="Produkty bez přiřazené značky — admin musí doplnit"
            >
              Bez výrobce ({noBrandCount})
            </Link>
          )}
        </div>
      </div>

      <ProductsBulkTable products={filtered} sort={sort} />

      <div className="mt-3 text-xs text-text3">
        Zobrazeno {filtered.length} z {allProducts.length} produktů
        {brand && <> &middot; výrobce: <strong>{brand}</strong></>}
      </div>
    </div>
  )
}
