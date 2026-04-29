import Link from 'next/link'
import { getAllRetailers, getRetailerOfferCounts } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'

export default async function AdminRetailersPage() {
  const [retailers, offerCounts] = await Promise.all([
    getAllRetailers(),
    getRetailerOfferCounts(),
  ])

  // We also need base_tracking_url to show status per retailer
  const { data: templates } = await supabaseAdmin
    .from('retailers')
    .select('id, base_tracking_url')
  const templateMap = new Map(
    (templates ?? []).map((r: Record<string, unknown>) => [r.id as string, r.base_tracking_url as string | null])
  )

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-1.5">— Obchod</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Prodejci</h1>
          <p className="text-[13px] text-zinc-400 mt-1">{retailers.length} aktivních partnerů</p>
        </div>
        <Link
          href="/admin/retailers/new"
          className="bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-olive2 transition-colors"
        >
          + Nový prodejce
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-[var(--radius-card)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800/40">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Jméno</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Doména</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Síť</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Komise</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Affiliate</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Nabídek</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Stav</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {retailers.map(r => {
              const template = templateMap.get(r.id)
              const hasAffiliate = !!template
              const offers = offerCounts[r.id] ?? 0
              return (
                <tr key={r.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-sm font-medium text-white">{r.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{r.domain}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{r.affiliateNetwork || '—'}</td>
                  <td className="px-4 py-3 text-sm text-white text-right tabular-nums">{r.defaultCommissionPct}%</td>
                  <td className="px-4 py-3 text-center">
                    {hasAffiliate ? (
                      <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                        ✓ Aktivní
                      </span>
                    ) : (
                      <span className="text-[11px] bg-amber-500/100/10 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                        ⚠ Chybí
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right tabular-nums">{offers}</td>
                  <td className="px-4 py-3 text-center">
                    {r.isActive ? (
                      <span className="text-[11px] text-olive">● aktivní</span>
                    ) : (
                      <span className="text-[11px] text-zinc-500">○ neaktivní</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/retailers/${r.id}`}
                      className="text-[12px] text-olive hover:text-emerald-400"
                    >
                      Upravit →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
