// Admin dashboard — real-data overview. Metric cards, click chart, activity
// feed, "needs attention" tasks. No mock data.

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getSiteStats, getAllRetailers } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'
import { BulkFetchImagesButton } from './bulk-fetch-images'

export const revalidate = 60

interface ClickRow {
  clicked_at: string
  product_id: string | null
  retailer_id: string | null
}

interface DailyClicks {
  date: string
  count: number
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function fmtCZK(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/ /g, ' ')} Kč`
}

function fmtDate(s: string): string {
  const d = new Date(s)
  return `${d.getDate()}. ${d.getMonth() + 1}.`
}

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'právě teď'
  if (diff < 3600) return `před ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `před ${Math.floor(diff / 3600)} h`
  return `před ${Math.floor(diff / 86400)} d`
}

async function getClickStats(): Promise<{
  last7d: number
  prev7d: number
  byDay: DailyClicks[]
  estCommission7d: number
}> {
  const now = new Date()
  const start7 = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))
  const startPrev = startOfDay(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000))

  const { data: rows } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('clicked_at, product_id, retailer_id')
    .gte('clicked_at', startPrev.toISOString())

  const clicks = (rows ?? []) as ClickRow[]
  const last7d = clicks.filter((c) => new Date(c.clicked_at) >= start7).length
  const prev7d = clicks.filter((c) => {
    const t = new Date(c.clicked_at)
    return t >= startPrev && t < start7
  }).length

  // Build per-day counts for last 7 days
  const byDay: DailyClicks[] = []
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
    const next = new Date(day.getTime() + 24 * 60 * 60 * 1000)
    const count = clicks.filter((c) => {
      const t = new Date(c.clicked_at)
      return t >= day && t < next
    }).length
    byDay.push({ date: day.toISOString().slice(0, 10), count })
  }

  // Estimate commission: for clicks in last 7d, look up cheapest offer × commission_pct
  const productIds7d = [
    ...new Set(clicks.filter((c) => new Date(c.clicked_at) >= start7).map((c) => c.product_id).filter(Boolean) as string[]),
  ]
  let estCommission7d = 0
  if (productIds7d.length > 0) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, price, commission_pct')
      .in('product_id', productIds7d)
    const byProduct = new Map<string, { price: number; pct: number }>()
    for (const o of offers ?? []) {
      const pid = o.product_id as string
      const price = Number(o.price) || 0
      const pct = Number(o.commission_pct) || 0
      const existing = byProduct.get(pid)
      if (!existing || price < existing.price) {
        byProduct.set(pid, { price, pct })
      }
    }
    for (const c of clicks.filter((c) => new Date(c.clicked_at) >= start7)) {
      if (!c.product_id) continue
      const o = byProduct.get(c.product_id)
      if (!o) continue
      estCommission7d += o.price * (o.pct / 100)
    }
  }

  return { last7d, prev7d, byDay, estCommission7d }
}

async function getActivityFeed(): Promise<
  Array<{ kind: 'discovery' | 'bulk' | 'manager'; ts: string; title: string; subtitle?: string }>
> {
  const [discoveryRes, bulkRes, managerRes] = await Promise.all([
    supabaseAdmin
      .from('discovery_candidates')
      .select('id, suggested_name, source_domain, scraped_at, status')
      .order('scraped_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('bulk_jobs')
      .select('id, type, status, total, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('manager_reports')
      .select('id, generated_at')
      .order('generated_at', { ascending: false })
      .limit(3),
  ])

  type FeedItem = { kind: 'discovery' | 'bulk' | 'manager'; ts: string; title: string; subtitle?: string }
  const items: FeedItem[] = []

  for (const d of discoveryRes.data ?? []) {
    items.push({
      kind: 'discovery',
      ts: d.scraped_at as string,
      title: `Nový kandidát: ${d.suggested_name ?? '(bez názvu)'}`,
      subtitle: `${d.source_domain ?? '—'} · ${d.status}`,
    })
  }
  for (const b of bulkRes.data ?? []) {
    items.push({
      kind: 'bulk',
      ts: b.created_at as string,
      title: `Bulk job: ${b.type}`,
      subtitle: `${b.total} položek · ${b.status}`,
    })
  }
  for (const m of managerRes.data ?? []) {
    items.push({
      kind: 'manager',
      ts: m.generated_at as string,
      title: 'Manager report vygenerován',
    })
  }

  return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 8)
}

async function getNeedsAttention() {
  const [draftsRes, missingTplRes, missingAffiliateRes] = await Promise.all([
    supabaseAdmin.from('products').select('id, name', { count: 'exact' }).eq('status', 'draft'),
    supabaseAdmin.from('retailers').select('id, name, base_tracking_url'),
    supabaseAdmin
      .from('product_offers')
      .select('id', { count: 'exact', head: true })
      .or('affiliate_url.is.null,affiliate_url.eq.'),
  ])

  const drafts = draftsRes.count ?? 0
  const missingTemplates = (missingTplRes.data ?? []).filter((r: Record<string, unknown>) => !r.base_tracking_url)
  const offersWithoutAffiliate = missingAffiliateRes.count ?? 0

  return { drafts, missingTemplates, offersWithoutAffiliate }
}

function deltaPct(curr: number, prev: number): { value: number; positive: boolean } | null {
  if (prev === 0 && curr === 0) return null
  if (prev === 0) return { value: 100, positive: true }
  const v = ((curr - prev) / prev) * 100
  return { value: Math.abs(Math.round(v)), positive: v >= 0 }
}

export default async function AdminDashboardPage() {
  const [stats, retailers, clickStats, activity, attention] = await Promise.all([
    getSiteStats(),
    getAllRetailers(),
    getClickStats(),
    getActivityFeed(),
    getNeedsAttention(),
  ])

  const clickDelta = deltaPct(clickStats.last7d, clickStats.prev7d)
  const maxBar = Math.max(1, ...clickStats.byDay.map((d) => d.count))

  const cards = [
    {
      label: 'Aktivní produkty',
      value: stats.totalProducts.toString(),
      sub: `${attention.drafts} v draftu`,
      href: '/admin/products',
    },
    {
      label: 'Kliky · 7 dní',
      value: clickStats.last7d.toString(),
      sub: clickDelta
        ? `${clickDelta.positive ? '↑' : '↓'} ${clickDelta.value} % vs. předchozí týden`
        : 'bez srovnání',
      delta: clickDelta,
      href: '/admin/products',
    },
    {
      label: 'Provize odhad · 7 dní',
      value: fmtCZK(clickStats.estCommission7d),
      sub: 'cena × % provize z kliknutých olejů',
      href: '/admin/retailers',
    },
    {
      label: 'Prodejci',
      value: retailers.length.toString(),
      sub: `${attention.missingTemplates.length} bez affiliate šablony`,
      href: '/admin/retailers',
    },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1.5">
            Přehled
          </h1>
          <p className="text-[13px] text-text2">
            {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="mx-1.5 text-text3">·</span>
            posledních 7 dní
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products?status=draft"
            className="text-[13px] text-text2 border border-off2 rounded-full px-4 py-2 hover:border-olive/40 hover:text-text transition-colors"
          >
            Schválit drafty
          </Link>
          <Link
            href="/admin/products"
            className="text-[13px] bg-olive text-white rounded-full px-4 py-2 font-medium hover:bg-olive2 transition-colors"
          >
            + Přidat produkt
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group bg-white border border-off2 rounded-xl p-5 hover:border-olive/40 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-medium tracking-wide text-text3">{c.label}</span>
              <ArrowUpRight size={14} strokeWidth={1.75} className="text-text3 group-hover:text-olive transition-colors" />
            </div>
            <div className="text-[28px] font-medium text-text tabular-nums tracking-tight leading-none mb-2">
              {c.value}
            </div>
            <div className={`text-[11px] ${c.delta ? (c.delta.positive ? 'text-green-600' : 'text-red-500') : 'text-text3'}`}>
              {c.sub}
            </div>
          </Link>
        ))}
      </div>

      {/* Chart + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3 mb-6">
        {/* Click chart */}
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[13px] font-medium text-text">Prokliky podle dne</h2>
              <p className="text-[11px] text-text3 mt-0.5">posledních 7 dní · {clickStats.last7d} celkem</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-[140px]">
            {clickStats.byDay.map((d) => {
              const pct = (d.count / maxBar) * 100
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-olive/80 hover:bg-olive transition-colors rounded-t-sm"
                      style={{ height: `${pct}%`, minHeight: d.count > 0 ? '2px' : '0' }}
                      title={`${d.date}: ${d.count} kliků`}
                    />
                  </div>
                  <div className="text-[10px] text-text3 tabular-nums">{fmtDate(d.date)}</div>
                  <div className="text-[10px] text-text2 tabular-nums font-medium">{d.count}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-medium text-text">Aktivita</h2>
            <span className="text-[11px] text-text3">posledních {activity.length}</span>
          </div>
          {activity.length === 0 ? (
            <p className="text-[12px] text-text3 italic">Zatím žádná aktivita.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item, i) => {
                const dotColor =
                  item.kind === 'discovery' ? 'bg-blue-500' : item.kind === 'bulk' ? 'bg-amber-500' : 'bg-olive'
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-text leading-snug truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-text3 truncate">{item.subtitle}</div>
                      )}
                      <div className="text-[10px] text-text3 mt-0.5">{fmtRelative(item.ts)}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Needs attention */}
      {(attention.drafts > 0 ||
        attention.missingTemplates.length > 0 ||
        attention.offersWithoutAffiliate > 0) && (
        <div className="bg-white border border-off2 rounded-xl p-5 mb-6">
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-3">
            — Vyžaduje pozornost
          </div>
          <ul className="divide-y divide-off">
            {attention.drafts > 0 && (
              <li className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-text">{attention.drafts} produktů v draftu</div>
                  <div className="text-[11px] text-text3">Schvál nebo zamítni před tím, než se objeví na webu</div>
                </div>
                <Link href="/admin/products?status=draft" className="text-[12px] text-olive hover:text-olive2 font-medium">
                  Otevřít →
                </Link>
              </li>
            )}
            {attention.missingTemplates.length > 0 && (
              <li className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-text">
                    {attention.missingTemplates.length} prodejců bez affiliate šablony
                  </div>
                  <div className="text-[11px] text-text3 truncate max-w-[400px]">
                    {attention.missingTemplates.map((r: Record<string, unknown>) => r.name as string).join(', ')}
                  </div>
                </div>
                <Link href="/admin/retailers" className="text-[12px] text-olive hover:text-olive2 font-medium">
                  Otevřít →
                </Link>
              </li>
            )}
            {attention.offersWithoutAffiliate > 0 && (
              <li className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-text">
                    {attention.offersWithoutAffiliate} nabídek bez affiliate URL
                  </div>
                  <div className="text-[11px] text-text3">Bez affiliate URL nedostáváš provizi z prokliku</div>
                </div>
                <Link href="/admin/retailers" className="text-[12px] text-olive hover:text-olive2 font-medium">
                  Opravit →
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white border border-off2 rounded-xl p-5">
        <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-3">
          — Rychlé akce
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/discovery"
            className="text-[12px] bg-off text-text2 hover:bg-olive-bg hover:text-olive border border-off2 hover:border-olive/30 rounded-full px-3.5 py-1.5 transition-colors"
          >
            Discovery návrhy
          </Link>
          <Link
            href="/admin/retailers/new"
            className="text-[12px] bg-off text-text2 hover:bg-olive-bg hover:text-olive border border-off2 hover:border-olive/30 rounded-full px-3.5 py-1.5 transition-colors"
          >
            + Nový prodejce
          </Link>
          <Link
            href="/admin/quality"
            className="text-[12px] bg-off text-text2 hover:bg-olive-bg hover:text-olive border border-off2 hover:border-olive/30 rounded-full px-3.5 py-1.5 transition-colors"
          >
            Kvalita dat
          </Link>
          <BulkFetchImagesButton />
        </div>
      </div>
    </div>
  )
}
