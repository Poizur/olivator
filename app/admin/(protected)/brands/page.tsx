import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-olive-bg text-olive-dark',
    draft: 'bg-amber-50 text-amber-700',
    inactive: 'bg-off text-text3',
  }
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${styles[status] ?? styles.inactive}`}>
      {status}
    </span>
  )
}

export default async function AdminBrandsPage() {
  const [brands, productCounts] = await Promise.all([getBrands(), getProductCountsByBrand()])

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Značky</h1>
          <p className="text-[13px] text-text2 mt-1">{brands.length} značek v katalogu</p>
        </div>
      </div>

      <div className="bg-white border border-off2 rounded-xl divide-y divide-off2">
        {brands.map((b) => (
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
