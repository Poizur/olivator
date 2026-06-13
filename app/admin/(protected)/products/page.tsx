import Link from 'next/link'
import { getProductsAdmin } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateCompleteness } from '@/lib/completeness'
import { BulkRescrapeButton } from './bulk-rescrape-button'
import { BackfillDraftsButton } from './backfill-drafts-button'
import { ProductsBulkTable } from './products-bulk-table'
import { ProductsFilterPanel } from './products-filter-panel'
import { StatusFilters } from '@/components/admin/status-filters'
import { BulkFillSpecsButton } from '@/components/admin/bulk-fill-specs-button'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchBar } from '@/components/admin/admin-search-bar'

const NO_BRAND = '__none__'
const DEFAULT_PER_PAGE = 50

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const perPage = Math.min(250, Math.max(10, parseInt(sp.perPage ?? String(DEFAULT_PER_PAGE))))
  const search = sp.search?.trim()
  const sort = sp.sort ?? 'recent'
  const order = sp.order ?? 'desc'
  const status = sp.status
  const brand = sp.brand
  const type = sp.type
  const originCountry = sp.origin
  const missing = sp.missing ? sp.missing.split(',').filter(Boolean) : []
  const hasOffers = sp.hasOffers
  const scoreMin = sp.scoreMin ? parseInt(sp.scoreMin) : undefined
  const scoreMax = sp.scoreMax ? parseInt(sp.scoreMax) : undefined

  // Build serialized params string for client components (no useSearchParams needed)
  const currentParamsString = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined)) as Record<string, string>,
  ).toString()

  // Main paginated query + status/brand/type/origin metadata — all in parallel
  const [
    { products: rawProducts, count: totalCount },
    statusData,
    brandData,
    brandsResult,
    typeRows,
    originRows,
  ] = await Promise.all([
    getProductsAdmin({
      page,
      perPage,
      search,
      status,
      brandSlug: brand,
      sort,
      order,
      type,
      originCountry,
      missing,
      hasOffers,
      scoreMin,
      scoreMax,
    }),
    // Light query for global status counts (not filtered by search)
    supabaseAdmin.from('products').select('status'),
    // Light query for brand counts (filtered by current status for UX)
    supabaseAdmin
      .from('products')
      .select('brand_slug, status')
      .not('brand_slug', 'is', null),
    // Brand display names
    supabaseAdmin.from('brands').select('slug, name').order('name'),
    // Available types for filter panel
    supabaseAdmin.from('products').select('type').not('type', 'is', null),
    // Available origin countries for filter panel
    supabaseAdmin.from('products').select('origin_country').not('origin_country', 'is', null),
  ])

  // Compute completeness for the current page only
  const products = rawProducts.map((p) => ({
    ...p,
    _completeness: calculateCompleteness(p),
  }))

  // Client-side completeness sort (page-local — server can't sort by computed field)
  if (sort === 'completeness') {
    const asc = order === 'asc'
    products.sort((a, b) =>
      asc
        ? a._completeness.weightedPercent - b._completeness.weightedPercent
        : b._completeness.weightedPercent - a._completeness.weightedPercent,
    )
  }

  // Status counts (global, unaffected by search/filters)
  const allStatuses = statusData.data ?? []
  const statusCounts = {
    all: allStatuses.length,
    active: allStatuses.filter((r) => r.status === 'active').length,
    draft: allStatuses.filter((r) => r.status === 'draft').length,
    inactive: allStatuses.filter((r) => r.status === 'inactive').length,
    excluded: allStatuses.filter((r) => r.status === 'excluded').length,
  }

  // Brand filter counts (respect current status filter)
  const brandNameBySlug = new Map<string, string>(
    (brandsResult.data ?? []).map((b) => [b.slug as string, b.name as string]),
  )
  const brandSource = status
    ? (brandData.data ?? []).filter((r) => r.status === status)
    : (brandData.data ?? [])
  const brandCounts = new Map<string, number>()
  let noBrandCount = 0
  for (const row of brandSource) {
    if (!row.brand_slug) { noBrandCount++; continue }
    brandCounts.set(row.brand_slug, (brandCounts.get(row.brand_slug) ?? 0) + 1)
  }
  const brands: [string, number, string][] = [...brandCounts.entries()]
    .map(([slug, count]): [string, number, string] => [slug, count, brandNameBySlug.get(slug) ?? slug])
    .sort((a, b) => b[1] - a[1])

  const VISIBLE_BRANDS = 15
  const visibleBrands = brands.slice(0, VISIBLE_BRANDS)
  const hiddenBrands = brands.slice(VISIBLE_BRANDS)
  const hasActiveInHidden = !!brand && hiddenBrands.some(([slug]) => slug === brand)

  // Available types + origins for filter panel
  const availableTypes = [...new Set((typeRows.data ?? []).map((r) => r.type as string))].sort()
  const availableOrigins = [...new Set((originRows.data ?? []).map((r) => r.origin_country as string))].sort()

  function brandHref(value?: string) {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (search) p.set('search', search)
    if (value) p.set('brand', value)
    if (sp.type) p.set('type', sp.type)
    if (sp.origin) p.set('origin', sp.origin)
    if (sp.missing) p.set('missing', sp.missing)
    if (sp.hasOffers) p.set('hasOffers', sp.hasOffers)
    if (sp.scoreMin) p.set('scoreMin', sp.scoreMin)
    if (sp.scoreMax) p.set('scoreMax', sp.scoreMax)
    const qs = p.toString()
    return qs ? `/admin/products?${qs}` : '/admin/products'
  }

  const showBulkRescrape = status === 'draft' && statusCounts.draft > 0

  // Build queryParams for pagination links (preserves all current filters)
  const paginationParams: Record<string, string | undefined> = {
    search: search || undefined,
    sort: sort !== 'recent' ? sort : undefined,
    order: order !== 'desc' ? order : undefined,
    status,
    brand,
    type,
    origin: originCountry || undefined,
    missing: missing.length > 0 ? missing.join(',') : undefined,
    hasOffers,
    scoreMin: sp.scoreMin,
    scoreMax: sp.scoreMax,
    perPage: perPage !== DEFAULT_PER_PAGE ? String(perPage) : undefined,
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Produkty</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BulkFillSpecsButton />
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
          <details className="mb-3 group">
            <summary className="text-[12px] text-text3 cursor-pointer hover:text-text px-1 select-none">
              ⚙️ Pokročilé: Plný rescrape přes Playwright
            </summary>
            <div className="bg-off/40 border border-off2 rounded-xl p-4 mt-2 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-text2">Plná AI pipeline od nuly</div>
                <p className="text-[11px] text-text3 mt-0.5 leading-snug">
                  Znovu projde URL produktu, vytáhne kompletní data. ~30–60 s/draft, $0,05/draft.
                </p>
              </div>
              <BulkRescrapeButton draftCount={statusCounts.draft} />
            </div>
          </details>
        </>
      )}

      {/* Search bar */}
      <div className="mb-4">
        <AdminSearchBar
          defaultValue={search}
          placeholder="Hledat název, EAN, výrobce..."
          currentParamsString={currentParamsString}
        />
      </div>

      {/* Status filters */}
      <StatusFilters
        active={status}
        basePath="/admin/products"
        preserveQuery={{ brand, search, sort: sort !== 'recent' ? sort : undefined, order: order !== 'desc' ? order : undefined }}
        options={[
          { value: undefined, label: 'Vše', count: statusCounts.all },
          { value: 'active', label: 'Aktivní', count: statusCounts.active },
          { value: 'draft', label: 'Drafty', count: statusCounts.draft },
          { value: 'inactive', label: 'Neaktivní', count: statusCounts.inactive },
          { value: 'excluded', label: 'Vyřazené', count: statusCounts.excluded },
        ]}
      />

      {/* Brand filter row */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-1.5">Výrobce</div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={brandHref(undefined)}
            className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
              !brand ? 'bg-olive text-white' : 'bg-white border border-off2 text-text2 hover:border-olive3 hover:text-olive'
            }`}
          >
            Všichni
          </Link>
          {visibleBrands.map(([slug, count, label]) => (
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
              title="Produkty bez přiřazené značky"
            >
              Bez výrobce ({noBrandCount})
            </Link>
          )}
        </div>
        {hiddenBrands.length > 0 && (
          <details className="mt-2" open={hasActiveInHidden}>
            <summary className="text-[12px] text-olive cursor-pointer hover:underline select-none w-fit">
              Další výrobci ({hiddenBrands.length})
            </summary>
            <div className="flex gap-2 flex-wrap items-center mt-2">
              {hiddenBrands.map(([slug, count, label]) => (
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
            </div>
          </details>
        )}
      </div>

      {/* Advanced filters */}
      <ProductsFilterPanel
        currentParamsString={currentParamsString}
        availableTypes={availableTypes}
        availableOrigins={availableOrigins}
        activeType={type}
        activeOrigin={originCountry}
        activeMissing={missing}
        activeHasOffers={hasOffers}
        activeScoreMin={sp.scoreMin}
        activeScoreMax={sp.scoreMax}
      />

      <ProductsBulkTable
        products={products}
        sort={sort}
        order={order}
        currentParamsString={currentParamsString}
      />

      <AdminPagination
        page={page}
        perPage={perPage}
        total={totalCount}
        basePath="/admin/products"
        queryParams={paginationParams}
      />

      <div className="mt-2 text-xs text-text3">
        Zobrazeno {products.length} z {totalCount.toLocaleString('cs-CZ')} produktů
        {search && <> · hledáno: <strong>&quot;{search}&quot;</strong></>}
        {brand && brand !== NO_BRAND && <> · výrobce: <strong>{brandNameBySlug.get(brand) ?? brand}</strong></>}
        {sort === 'completeness' && (
          <span className="text-amber-600"> · Kompletnost řazena v rámci stránky (ne globálně)</span>
        )}
      </div>
    </div>
  )
}
