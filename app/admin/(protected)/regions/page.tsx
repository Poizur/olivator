import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    draft: 'bg-amber-500/100/10 text-amber-400',
    inactive: 'bg-zinc-800/40 text-zinc-500',
  }
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${styles[status] ?? styles.inactive}`}>
      {status}
    </span>
  )
}

export default async function AdminRegionsPage() {
  const [regions, productCounts] = await Promise.all([getRegions(), getProductCountsByRegion()])

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Regiony</h1>
          <p className="text-[13px] text-zinc-400 mt-1">{regions.length} regionů v katalogu</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
        {regions.map((r) => (
          <div key={r.slug} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/admin/regions/${r.slug}`} className="font-medium text-white hover:text-olive">
                  {r.name}
                </Link>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-xs text-zinc-500">
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
                className="px-3 py-1.5 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:border-olive"
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
