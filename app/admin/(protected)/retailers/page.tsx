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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Prodejci</h1>
        <Link
          href="/admin/retailers/new"
          className="bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-olive-dark transition-colors"
        >
          + Nový prodejce
        </Link>
      </div>

      <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-off">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Jméno</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Doména</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Síť</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Komise</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Affiliate</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Nabídek</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Stav</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {retailers.map(r => {
              const template = templateMap.get(r.id)
              const hasAffiliate = !!template
              const offers = offerCounts[r.id] ?? 0
              return (
                <tr key={r.id} className="border-t border-off hover:bg-off/50">
                  <td className="px-4 py-3 text-sm font-medium text-text">{r.name}</td>
                  <td className="px-4 py-3 text-sm text-text2">{r.domain}</td>
                  <td className="px-4 py-3 text-sm text-text2">{r.affiliateNetwork || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text text-right tabular-nums">{r.defaultCommissionPct}%</td>
                  <td className="px-4 py-3 text-center">
                    {hasAffiliate ? (
                      <span className="text-[11px] bg-olive-bg text-olive-dark px-2 py-0.5 rounded-full font-medium">
                        ✓ Aktivní
                      </span>
                    ) : (
                      <span className="text-[11px] bg-terra-bg text-terra px-2 py-0.5 rounded-full font-medium">
                        ⚠ Chybí
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text text-right tabular-nums">{offers}</td>
                  <td className="px-4 py-3 text-center">
                    {r.isActive ? (
                      <span className="text-[11px] text-olive">● aktivní</span>
                    ) : (
                      <span className="text-[11px] text-text3">○ neaktivní</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/retailers/${r.id}`}
                      className="text-[12px] text-olive hover:text-olive-dark"
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
