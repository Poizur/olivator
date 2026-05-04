import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { RegenerateAllButton } from '@/components/regenerate-all-button'
import { StatusBadge } from '@/components/admin/status-badge'
import { StatusFilters } from '@/components/admin/status-filters'

async function getBrands() {
  const { data } = await supabaseAdmin
    .from('brands')
    .select('slug, name, country_code, status, description_long, updated_at')
    .order('name')
  return data ?? []
}

async function getProductCountsByBrand(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('brand_slug')
    .eq('status', 'active')
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.brand_slug) counts[row.brand_slug] = (counts[row.brand_slug] ?? 0) + 1
  }
  return counts
}

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const [brands, productCounts] = await Promise.all([getBrands(), getProductCountsByBrand()])

  const filtered = status ? brands.filter((b) => b.status === status) : brands
  const counts = {
    all: brands.length,
    active: brands.filter((b) => b.status === 'active').length,
    draft: brands.filter((b) => b.status === 'draft').length,
    inactive: brands.filter((b) => b.status === 'inactive').length,
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Značky</h1>
          <p className="text-[13px] text-text2 mt-1">{brands.length} značek v katalogu</p>
        </div>
        <RegenerateAllButton
          entityType="brands"
          estimatedCount={brands.length}
          label="Přepsat editorial obsah všech značek"
        />
      </div>

      <StatusFilters
        active={status}
        basePath="/admin/brands"
        options={[
          { value: undefined, label: 'Vše', count: counts.all },
          { value: 'active', label: 'Aktivní', count: counts.active },
          { value: 'draft', label: 'Drafty', count: counts.draft },
          { value: 'inactive', label: 'Neaktivní', count: counts.inactive },
        ]}
      />

      <div className="bg-white border border-off2 rounded-xl divide-y divide-off2">
        {filtered.map((b) => (
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
                {b.description_long
                  ? ` · text ${b.description_long.length} znaků`
                  : ' · bez textu'}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/znacka/${b.slug}`}
                target="_blank"
                className="text-xs text-olive hover:underline"
              >
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
    </div>
  )
}
