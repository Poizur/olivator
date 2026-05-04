import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { RegenerateAllButton } from '@/components/regenerate-all-button'
import { StatusBadge } from '@/components/admin/status-badge'
import { StatusFilters } from '@/components/admin/status-filters'

async function getRegions() {
  const { data } = await supabaseAdmin
    .from('regions')
    .select('slug, name, country_code, status, description_long, meta_title, updated_at')
    .order('name')
  return data ?? []
}

async function getProductCountsByRegion(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('region_slug')
    .eq('status', 'active')
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.region_slug) counts[row.region_slug] = (counts[row.region_slug] ?? 0) + 1
  }
  return counts
}

export default async function AdminRegionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const [regions, productCounts] = await Promise.all([getRegions(), getProductCountsByRegion()])

  const filtered = status ? regions.filter((r) => r.status === status) : regions
  const counts = {
    all: regions.length,
    active: regions.filter((r) => r.status === 'active').length,
    draft: regions.filter((r) => r.status === 'draft').length,
    inactive: regions.filter((r) => r.status === 'inactive').length,
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Regiony</h1>
          <p className="text-[13px] text-text2 mt-1">{regions.length} regionů v katalogu</p>
        </div>
        <RegenerateAllButton
          entityType="regions"
          estimatedCount={regions.length}
          label="Přepsat editorial obsah všech regionů"
        />
      </div>

      <StatusFilters
        active={status}
        basePath="/admin/regions"
        options={[
          { value: undefined, label: 'Vše', count: counts.all },
          { value: 'active', label: 'Aktivní', count: counts.active },
          { value: 'draft', label: 'Drafty', count: counts.draft },
          { value: 'inactive', label: 'Neaktivní', count: counts.inactive },
        ]}
      />

      <div className="bg-white border border-off2 rounded-xl divide-y divide-off2">
        {filtered.map((r) => (
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
                {r.description_long
                  ? ` · text ${r.description_long.length} znaků`
                  : ' · bez textu'}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/oblast/${r.slug}`}
                target="_blank"
                className="text-xs text-olive hover:underline"
              >
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
    </div>
  )
}
