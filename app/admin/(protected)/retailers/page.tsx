import Link from 'next/link'
import { getAllRetailers, getRetailerOfferCounts, getDiscoveryProposals } from '@/lib/data'
import { RetailersPanel } from './retailers-panel'

export const dynamic = 'force-dynamic'

export default async function AdminRetailersPage() {
  const [retailers, offerCounts, proposals] = await Promise.all([
    getAllRetailers(),
    getRetailerOfferCounts(),
    getDiscoveryProposals('pending'),
  ])

  const active = retailers.filter(r => (r.retailerStatus ?? 'active') === 'active')
  const quarantine = retailers.filter(r => (r.retailerStatus ?? 'active') === 'quarantine')
  const removedLegal = retailers.filter(r => (r.retailerStatus ?? 'active') === 'removed_legal')

  const pendingProposals = proposals.length

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Obchod</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Prodejci</h1>
          <p className="text-[13px] text-text2 mt-1">
            <span className="text-olive font-medium">{active.length} aktivních</span>
            {' · '}
            <span className="text-amber-600 font-medium">{quarantine.length} v karanténě</span>
            {' · '}
            <span className="text-red-400 font-medium">{removedLegal.length} {removedLegal.length === 1 ? 'odstraněn' : 'odstraněni'}</span>
            {pendingProposals > 0 && (
              <span className="ml-3 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                {pendingProposals} nových návrhů
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/retailers/new"
            className="bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-olive2 transition-colors"
          >
            + Nový prodejce
          </Link>
        </div>
      </div>

      <RetailersPanel
        active={active}
        quarantine={quarantine}
        removedLegal={removedLegal}
        offerCounts={offerCounts}
        proposals={proposals}
      />
    </div>
  )
}
