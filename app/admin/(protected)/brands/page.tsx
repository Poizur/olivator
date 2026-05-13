import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { RegenerateAllButton } from '@/components/regenerate-all-button'
import { BrandAutoFillBulkButton } from '@/components/brand-auto-fill-bulk-button'
import { StatusBadge } from '@/components/admin/status-badge'
import { StatusFilters } from '@/components/admin/status-filters'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchBar } from '@/components/admin/admin-search-bar'

const DEFAULT_PER_PAGE = 50

async function getProductCountsByBrand(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin.from('products').select('brand_slug').eq('status', 'active')
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.brand_slug) counts[row.brand_slug] = (counts[row.brand_slug] ?? 0) + 1
  }
  return counts
}

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; perPage?: string }>
}) {
  const { status, search, page: pageStr, perPage: perPageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const perPage = Math.min(250, Math.max(10, parseInt(perPageStr ?? String(DEFAULT_PER_PAGE))))

  const currentParamsString = new URLSearchParams(
    Object.fromEntries(
      Object.entries({ status, search, page: pageStr, perPage: perPageStr }).filter(([, v]) => v !== undefined),
    ) as Record<string, string>,
  ).toString()

  let brandsQuery = supabaseAdmin
    .from('brands')
    .select('slug, name, country_code, status, description_long, updated_at', { count: 'exact' })
    .order('name')

  if (status) brandsQuery = brandsQuery.eq('status', status)
  if (search?.trim()) brandsQuery = brandsQuery.ilike('name', `%${search.trim()}%`)

  brandsQuery = brandsQuery.range((page - 1) * perPage, page * perPage - 1)

  const [{ data: brands, count: totalCount }, productCounts, allBrandsForCounts] = await Promise.all([
    brandsQuery,
    getProductCountsByBrand(),
    // Light query for global status counts (not filtered by search)
    supabaseAdmin.from('brands').select('status'),
  ])

  const allStatuses = allBrandsForCounts.data ?? []
  const counts = {
    all: allStatuses.length,
    active: allStatuses.filter((b) => b.status === 'active').length,
    draft: allStatuses.filter((b) => b.status === 'draft').length,
    inactive: allStatuses.filter((b) => b.status === 'inactive').length,
  }
  const emptyCount = (brands ?? []).filter(
    (b) => !b.description_long || (b.description_long as string).length === 0,
  ).length

  const paginationParams: Record<string, string | undefined> = {
    status,
    search: search || undefined,
    perPage: perPage !== DEFAULT_PER_PAGE ? String(perPage) : undefined,
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Značky</h1>
          <p className="text-[13px] text-text2 mt-1">{counts.all} značek v katalogu</p>
        </div>
        <RegenerateAllButton
          entityType="brands"
          estimatedCount={counts.all}
          label="Přepsat editorial obsah všech značek"
        />
      </div>

      <div className="mb-4">
        <BrandAutoFillBulkButton emptyCount={emptyCount} />
      </div>

      <div className="mb-4">
        <AdminSearchBar
          defaultValue={search}
          placeholder="Hledat značku..."
          currentParamsString={currentParamsString}
        />
      </div>

      <StatusFilters
        active={status}
        basePath="/admin/brands"
        preserveQuery={{ search }}
        options={[
          { value: undefined, label: 'Vše', count: counts.all },
          { value: 'active', label: 'Aktivní', count: counts.active },
          { value: 'draft', label: 'Drafty', count: counts.draft },
          { value: 'inactive', label: 'Neaktivní', count: counts.inactive },
        ]}
      />

      <div className="bg-white border border-off2 rounded-xl divide-y divide-off2">
        {(brands ?? []).length === 0 && (
          <div className="px-5 py-10 text-center text-text3 text-sm">Žádné značky neodpovídají filtru</div>
        )}
        {(brands ?? []).map((b) => (
          <div key={b.slug} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/admin/brands/${b.slug}`} className="font-medium text-text hover:text-olive">
                  {b.name}
                </Link>
                <StatusBadge status={b.status} />
              </div>
              <div className="text-xs text-text3">
                {b.country_code} · {productCounts[b.slug] ?? 0} produktů
                {b.description_long ? ` · text ${b.description_long.length} znaků` : ' · bez textu'}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`/znacka/${b.slug}`} target="_blank" className="text-xs text-olive hover:underline">
                Náhled →
              </a>
              <Link
                href={`/admin/brands/${b.slug}`}
                className="px-3 py-1.5 border border-off2 rounded-lg text-xs text-text2 hover:border-olive"
              >
                Editovat
              </Link>
            </div>
          </div>
        ))}
      </div>

      <AdminPagination
        page={page}
        perPage={perPage}
        total={totalCount ?? 0}
        basePath="/admin/brands"
        queryParams={paginationParams}
      />
    </div>
  )
}
