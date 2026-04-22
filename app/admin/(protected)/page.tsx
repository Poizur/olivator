import Link from 'next/link'
import { getSiteStats, getAllRetailers } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'
import { BulkFetchImagesButton } from './bulk-fetch-images'

export default async function AdminDashboardPage() {
  const [stats, retailers] = await Promise.all([
    getSiteStats(),
    getAllRetailers(),
  ])

  // Stats we need beyond getSiteStats
  const { count: draftCount } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')

  const { count: clicksToday } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .gte('clicked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const retailersWithoutTemplate = retailers.filter(
    // We don't have baseTrackingUrl in basic Retailer; ask Supabase directly
    () => false
  )
  const { data: retailerTemplates } = await supabaseAdmin
    .from('retailers')
    .select('id, name, base_tracking_url')
  const missingTemplates = (retailerTemplates ?? []).filter((r: Record<string, unknown>) => !r.base_tracking_url)

  const cards = [
    { label: 'Produkty aktivní', value: stats.totalProducts, href: '/admin/products' },
    { label: 'Drafty (ke schválení)', value: draftCount ?? 0, href: '/admin/products?status=draft' },
    { label: 'Prodejci', value: retailers.length, href: '/admin/retailers' },
    { label: 'Affiliate kliky 24h', value: clicksToday ?? 0, href: '/admin/retailers' },
  ]

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-6">
        Přehled
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white border border-off2 rounded-[var(--radius-card)] p-5 hover:border-olive-light transition-colors"
          >
            <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-2">
              {c.label}
            </div>
            <div className="text-3xl font-semibold text-text tracking-tight">{c.value}</div>
          </Link>
        ))}
      </div>

      {missingTemplates.length > 0 && (
        <div className="bg-terra-bg border border-terra/20 rounded-[var(--radius-card)] p-5 mb-6">
          <div className="text-sm font-medium text-text mb-2 flex items-center gap-2">
            <span className="text-terra">⚠️</span>
            {missingTemplates.length} prodejců bez affiliate šablony
          </div>
          <div className="text-xs text-text2 mb-3">
            Tito prodejci mají nabídky, ale odkazy vedou přímo na jejich web — nedostáváš komisi.
            Jakmile budeš mít schválené partnerství, přidej šablonu v editaci prodejce.
          </div>
          <div className="flex flex-wrap gap-2">
            {missingTemplates.map((r: Record<string, unknown>) => (
              <Link
                key={r.id as string}
                href={`/admin/retailers/${r.id}`}
                className="text-xs bg-white border border-off2 rounded-full px-3 py-1 hover:border-olive-light hover:text-olive"
              >
                {r.name as string}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
        <h2 className="text-sm font-semibold text-text mb-3">Rychlé akce</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/retailers/new"
            className="bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-olive-dark transition-colors"
          >
            + Nový prodejce
          </Link>
          <Link
            href="/admin/products?status=draft"
            className="bg-off text-text rounded-full px-4 py-2 text-[13px] font-medium hover:bg-off2 transition-colors"
          >
            Schválit drafty
          </Link>
          <BulkFetchImagesButton />
        </div>
      </div>
    </div>
  )
}
