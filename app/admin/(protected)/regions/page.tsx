import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { RegenerateAllButton } from '@/components/regenerate-all-button'
import { StatusBadge } from '@/components/admin/status-badge'
import { StatusFilters } from '@/components/admin/status-filters'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchBar } from '@/components/admin/admin-search-bar'

const DEFAULT_PER_PAGE = 50

async function getProductCountsByRegion(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin.from('products').select('region_slug').eq('status', 'active')
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.region_slug) counts[row.region_slug] = (counts[row.region_slug] ?? 0) + 1
  }
  return counts
}

export default async function AdminRegionsPage({
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

  let regionsQuery = supabaseAdmin
    .from('regions')
    .select('slug, name, country_code, status, description_long, meta_title, updated_at', { count: 'exact' })
    .order('name')

  if (status) regionsQuery = regionsQuery.eq('status', status)
  if (search?.trim()) regionsQuery = regionsQuery.ilike('name', `%${search.trim()}%`)

  regionsQuery = regionsQuery.range((page - 1) * perPage, page * perPage - 1)

  const [{ data: regions, count: totalCount }, productCounts, allRegionsForCounts] = await Promise.all([
    regionsQuery,
    getProductCountsByRegion(),
    supabaseAdmin.from('regions').select('status'),
  ])

  const allStatuses = allRegionsForCounts.data ?? []
  const counts = {
    all: allStatuses.length,
    active: allStatuses.filter((r) => r.status === 'active').length,
    draft: allStatuses.filter((r) => r.status === 'draft').length,
    inactive: allStatuses.filter((r) => r.status === 'inactive').length,
  }

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
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Regiony</h1>
          <p className="text-[13px] text-text2 mt-1">{counts.all} regionů v katalogu</p>
        </div>
        <RegenerateAllButton
          entityType="regions"
          estimatedCount={counts.all}
          label="Přepsat editorial obsah všech regionů"
        />
      </div>

      <div className="mb-4">
        <AdminSearchBar
          defaultValue={search}
          placeholder="Hledat region..."
          currentParamsString={currentParamsString}
        />
      </div>

      <StatusFilters
        active={status}
        basePath="/admin/regions"
        preserveQuery={{ search }}
        options={[
          { value: undefined, label: 'Vše', count: counts.all },
          { value: 'active', label: 'Aktivní', count: counts.active },
          { value: 'draft', label: 'Drafty', count: counts.draft },
          { value: 'inactive', label: 'Neaktivní', count: counts.inactive },
        ]}
      />

      <div className="bg-white border border-off2 rounded-xl divide-y divide-off2">
        {(regions ?? []).length === 0 && (
          <div className="px-5 py-10 text-center text-text3 text-sm">Žádné regiony neodpovídají filtru</div>
        )}
        {(regions ?? []).map((r) => (
          <div key={r.slug} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/admin/regions/${r.slug}`} className="font-medium text-text hover:text-olive">
                  {r.name}
                </Link>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-xs text-text3">
                {r.country_code} · {productCounts[r.slug] ?? 0} produktů
                {r.description_long ? ` · text ${r.description_long.length} znaků` : ' · bez textu'}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`/oblast/${r.slug}`} target="_blank" className="text-xs text-olive hover:underline">
                Náhled →
              </a>
              <Link
                href={`/admin/regions/${r.slug}`}
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
        basePath="/admin/regions"
        queryParams={paginationParams}
      />
    </div>
  )
}
