import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { RegenerateAllButton } from '@/components/regenerate-all-button'
import { StatusBadge } from '@/components/admin/status-badge'
import { StatusFilters } from '@/components/admin/status-filters'

async function getCultivars() {
  const { data } = await supabaseAdmin
    .from('cultivars')
    .select('slug, name, status, description_long, updated_at')
    .order('name')
  return data ?? []
}

async function getProductCountsByCultivar(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from('product_cultivars')
    .select('cultivar_slug')
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.cultivar_slug) counts[row.cultivar_slug] = (counts[row.cultivar_slug] ?? 0) + 1
  }
  return counts
}

export default async function AdminCultivarsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const [cultivars, productCounts] = await Promise.all([getCultivars(), getProductCountsByCultivar()])

  const filtered = status ? cultivars.filter((c) => c.status === status) : cultivars
  const counts = {
    all: cultivars.length,
    active: cultivars.filter((c) => c.status === 'active').length,
    draft: cultivars.filter((c) => c.status === 'draft').length,
    inactive: cultivars.filter((c) => c.status === 'inactive').length,
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Odrůdy</h1>
          <p className="text-[13px] text-text2 mt-1">{cultivars.length} odrůd v katalogu</p>
        </div>
        <RegenerateAllButton
          entityType="cultivars"
          estimatedCount={cultivars.length}
          label="Přepsat editorial obsah všech odrůd"
        />
      </div>

      <StatusFilters
        active={status}
        basePath="/admin/cultivars"
        options={[
          { value: undefined, label: 'Vše', count: counts.all },
          { value: 'active', label: 'Aktivní', count: counts.active },
          { value: 'draft', label: 'Drafty', count: counts.draft },
          { value: 'inactive', label: 'Neaktivní', count: counts.inactive },
        ]}
      />

      <div className="bg-white border border-off2 rounded-xl divide-y divide-off2">
        {filtered.map((c) => (
          <div key={c.slug} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/admin/cultivars/${c.slug}`} className="font-medium text-text hover:text-olive">
                  {c.name}
                </Link>
                <StatusBadge status={c.status} />
              </div>
              <div className="text-xs text-text3">
                {productCounts[c.slug] ?? 0} produktů
                {c.description_long
                  ? ` · text ${c.description_long.length} znaků`
                  : ' · bez textu'}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/odruda/${c.slug}`}
                target="_blank"
                className="text-xs text-olive hover:underline"
              >
                Náhled →
              </a>
              <Link
                href={`/admin/cultivars/${c.slug}`}
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
