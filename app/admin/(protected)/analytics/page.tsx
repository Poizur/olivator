// Analytics hub — affiliate clicks deep dive.
//
// Data source: tabulka `affiliate_clicks` — každý záznam je 1 klik na
// /go/[retailer]/[slug] redirect endpoint. Anonymní (IP hashována).

import Link from 'next/link'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface ClickRow {
  id: string
  clicked_at: string
  product_id: string | null
  retailer_id: string | null
  session_id: string | null
  ip_hash: string | null
  user_agent: string | null
  referrer: string | null
}

interface TopProduct {
  productId: string
  name: string
  slug: string
  imageUrl: string | null
  score: number | null
  clicks: number
  uniqueIPs: number
  estCommission: number
}

interface TopRetailer {
  retailerId: string
  name: string
  slug: string
  clicks: number
  estCommission: number
}

interface DailyCount {
  date: string
  count: number
}

function fmtCZK(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ')} Kč`
}

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'právě teď'
  if (diff < 3600) return `před ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `před ${Math.floor(diff / 3600)} h`
  return `před ${Math.floor(diff / 86400)} d`
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function detectDevice(ua: string | null): string {
  if (!ua) return 'unknown'
  if (/iPhone|iPad/i.test(ua)) return 'iOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Mac OS X/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'Windows'
  return 'jiný'
}

function detectReferrer(ref: string | null): string {
  if (!ref) return 'přímo / jiné'
  try {
    const url = new URL(ref)
    const host = url.hostname.replace(/^www\./, '')
    if (host.includes('olivator')) return `interní (${url.pathname})`
    if (host.includes('google')) return 'Google'
    if (host.includes('seznam')) return 'Seznam'
    if (host.includes('facebook') || host.includes('fb.com')) return 'Facebook'
    if (host.includes('instagram')) return 'Instagram'
    return host
  } catch {
    return 'přímo / jiné'
  }
}

async function getClickAnalytics(rangeDays: number): Promise<{
  total: number
  uniqueIPs: number
  byDay: DailyCount[]
  topProducts: TopProduct[]
  topRetailers: TopRetailer[]
  recent: Array<{
    ts: string
    productName: string | null
    productSlug: string | null
    retailerName: string | null
    retailerSlug: string | null
    device: string
    referrer: string
    ipHash: string | null
  }>
  byReferrer: Array<{ source: string; count: number }>
  byDevice: Array<{ device: string; count: number }>
}> {
  const start = startOfDay(new Date(Date.now() - (rangeDays - 1) * 86400000))

  const { data: rows } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('id, clicked_at, product_id, retailer_id, session_id, ip_hash, user_agent, referrer')
    .gte('clicked_at', start.toISOString())
    .order('clicked_at', { ascending: false })

  const clicks = (rows ?? []) as ClickRow[]
  const total = clicks.length
  const uniqueIPs = new Set(clicks.map((c) => c.ip_hash).filter(Boolean)).size

  // Time series (daily)
  const byDay: DailyCount[] = []
  const now = new Date()
  for (let i = rangeDays - 1; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * 86400000))
    const next = new Date(day.getTime() + 86400000)
    const count = clicks.filter((c) => {
      const t = new Date(c.clicked_at)
      return t >= day && t < next
    }).length
    byDay.push({ date: day.toISOString().slice(0, 10), count })
  }

  // Top products
  const productClicks = new Map<string, { clicks: number; ips: Set<string> }>()
  for (const c of clicks) {
    if (!c.product_id) continue
    const existing = productClicks.get(c.product_id) ?? { clicks: 0, ips: new Set() }
    existing.clicks++
    if (c.ip_hash) existing.ips.add(c.ip_hash)
    productClicks.set(c.product_id, existing)
  }

  const topProductIds = [...productClicks.entries()]
    .sort((a, b) => b[1].clicks - a[1].clicks)
    .slice(0, 10)
    .map(([id]) => id)

  let topProducts: TopProduct[] = []
  if (topProductIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, name_short, image_url, olivator_score')
      .in('id', topProductIds)
    const productMap = new Map<string, {
      slug: string
      name: string
      image_url: string | null
      olivator_score: number | null
    }>()
    for (const p of products ?? []) {
      productMap.set(p.id as string, {
        slug: p.slug as string,
        name: ((p.name_short as string | null) ?? (p.name as string)) || '?',
        image_url: p.image_url as string | null,
        olivator_score: p.olivator_score as number | null,
      })
    }

    // Get cheapest offers for commission estimate
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, price, commission_pct')
      .in('product_id', topProductIds)
    const cheapestOffer = new Map<string, { price: number; pct: number }>()
    for (const o of offers ?? []) {
      const pid = o.product_id as string
      const price = Number(o.price) || 0
      const pct = Number(o.commission_pct) || 0
      const existing = cheapestOffer.get(pid)
      if (!existing || price < existing.price) cheapestOffer.set(pid, { price, pct })
    }

    topProducts = topProductIds
      .map((id) => {
        const p = productMap.get(id)
        const stats = productClicks.get(id)!
        const offer = cheapestOffer.get(id)
        const estCommission = offer ? stats.clicks * offer.price * (offer.pct / 100) : 0
        return {
          productId: id,
          name: p?.name ?? '(odstraněno)',
          slug: p?.slug ?? '',
          imageUrl: p?.image_url ?? null,
          score: p?.olivator_score ?? null,
          clicks: stats.clicks,
          uniqueIPs: stats.ips.size,
          estCommission,
        }
      })
      .filter((p) => p.slug)
  }

  // Top retailers
  const retailerClicks = new Map<string, number>()
  for (const c of clicks) {
    if (!c.retailer_id) continue
    retailerClicks.set(c.retailer_id, (retailerClicks.get(c.retailer_id) ?? 0) + 1)
  }
  const topRetailerIds = [...retailerClicks.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  let topRetailers: TopRetailer[] = []
  if (topRetailerIds.length > 0) {
    const { data: retailers } = await supabaseAdmin
      .from('retailers')
      .select('id, name, slug, default_commission_pct')
      .in('id', topRetailerIds)
    const retailerMap = new Map<string, { name: string; slug: string; pct: number }>()
    for (const r of retailers ?? []) {
      retailerMap.set(r.id as string, {
        name: r.name as string,
        slug: r.slug as string,
        pct: Number(r.default_commission_pct) || 0,
      })
    }
    topRetailers = topRetailerIds.map((id) => {
      const r = retailerMap.get(id)
      const clicks = retailerClicks.get(id)!
      // Hrubý odhad: 350 Kč průměrná cena × % retailer
      const avgPrice = 350
      const estCommission = r ? clicks * avgPrice * (r.pct / 100) : 0
      return {
        retailerId: id,
        name: r?.name ?? '(odstraněn)',
        slug: r?.slug ?? '',
        clicks,
        estCommission,
      }
    }).filter((r) => r.slug)
  }

  // Recent — last 30
  const recentClicks = clicks.slice(0, 30)
  const productNamesById = new Map<string, { name: string; slug: string }>()
  const retailerNamesById = new Map<string, { name: string; slug: string }>()
  if (recentClicks.length > 0) {
    const pids = [...new Set(recentClicks.map((c) => c.product_id).filter(Boolean) as string[])]
    const rids = [...new Set(recentClicks.map((c) => c.retailer_id).filter(Boolean) as string[])]
    if (pids.length > 0) {
      const { data: ps } = await supabaseAdmin
        .from('products')
        .select('id, slug, name, name_short')
        .in('id', pids)
      for (const p of ps ?? []) {
        productNamesById.set(p.id as string, {
          name: ((p.name_short as string | null) ?? (p.name as string)) || '?',
          slug: p.slug as string,
        })
      }
    }
    if (rids.length > 0) {
      const { data: rs } = await supabaseAdmin.from('retailers').select('id, name, slug').in('id', rids)
      for (const r of rs ?? []) {
        retailerNamesById.set(r.id as string, {
          name: r.name as string,
          slug: r.slug as string,
        })
      }
    }
  }

  const recent = recentClicks.map((c) => {
    const product = c.product_id ? productNamesById.get(c.product_id) : null
    const retailer = c.retailer_id ? retailerNamesById.get(c.retailer_id) : null
    return {
      ts: c.clicked_at,
      productName: product?.name ?? null,
      productSlug: product?.slug ?? null,
      retailerName: retailer?.name ?? null,
      retailerSlug: retailer?.slug ?? null,
      device: detectDevice(c.user_agent),
      referrer: detectReferrer(c.referrer),
      ipHash: c.ip_hash,
    }
  })

  // Aggregations
  const referrerCounts = new Map<string, number>()
  const deviceCounts = new Map<string, number>()
  for (const c of clicks) {
    const ref = detectReferrer(c.referrer)
    referrerCounts.set(ref, (referrerCounts.get(ref) ?? 0) + 1)
    const dev = detectDevice(c.user_agent)
    deviceCounts.set(dev, (deviceCounts.get(dev) ?? 0) + 1)
  }
  const byReferrer = [...referrerCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
  const byDevice = [...deviceCounts.entries()]
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total,
    uniqueIPs,
    byDay,
    topProducts,
    topRetailers,
    recent,
    byReferrer,
    byDevice,
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const rangeDays = range === '7' ? 7 : range === '90' ? 90 : 30

  const data = await getClickAnalytics(rangeDays)
  const maxBar = Math.max(1, ...data.byDay.map((d) => d.count))
  const totalEstCommission = data.topProducts.reduce((s, p) => s + p.estCommission, 0)

  return (
    <div>
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">
          Admin
        </Link>
        {' › '}
        Analytics
      </div>

      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1.5">
            Affiliate analytics
          </h1>
          <p className="text-[13px] text-text3 leading-snug max-w-[640px]">
            Anonymní data z <code className="bg-off rounded px-1 text-[12px]">affiliate_clicks</code> tabulky —
            každé kliknutí na „Koupit u X" projde přes redirect a uloží se do DB.
            IP jsou hashované (GDPR), uživatelé nejsou identifikováni.
          </p>
        </div>
        <div className="flex gap-1 bg-off rounded-lg p-1">
          {[
            { label: '7d', value: '7' },
            { label: '30d', value: '30' },
            { label: '90d', value: '90' },
          ].map((r) => (
            <Link
              key={r.value}
              href={`/admin/analytics?range=${r.value}`}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                String(rangeDays) === r.value
                  ? 'bg-white text-text font-medium shadow-sm'
                  : 'text-text2 hover:text-text'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Celkem kliků" value={data.total.toString()} sub={`${rangeDays} dní`} />
        <KpiCard
          label="Unikátní návštěvníci"
          value={data.uniqueIPs.toString()}
          sub={data.total > 0 ? `${(data.total / Math.max(data.uniqueIPs, 1)).toFixed(1)} kliků/uživatel` : '—'}
        />
        <KpiCard
          label="Top produkt"
          value={data.topProducts[0]?.clicks?.toString() ?? '—'}
          sub={data.topProducts[0]?.name ?? 'kliků'}
        />
        <KpiCard label="Odhad provize" value={fmtCZK(totalEstCommission)} sub="z top 10 produktů" />
      </div>

      {/* Time series chart */}
      <div className="bg-white border border-off2 rounded-xl p-5 mb-3">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[14px] font-medium text-text">Prokliky podle dne</h2>
            <p className="text-[11px] text-text3 mt-0.5">{rangeDays} dní</p>
          </div>
        </div>
        {data.total === 0 ? (
          <p className="text-[12px] text-text3 italic py-8 text-center">
            Zatím žádné kliky v tomto období.
            <br />
            <span className="text-text3">
              Affiliate kliky naběhnou když uživatelé začnou klikat na „Koupit u X" tlačítka na produktech.
            </span>
          </p>
        ) : (
          <div className="flex items-end gap-[2px] h-[140px]">
            {data.byDay.map((d, i) => {
              const pct = (d.count / maxBar) * 100
              const isLast = i === data.byDay.length - 1
              return (
                <div key={d.date} className="flex-1 relative group" title={`${d.date}: ${d.count}`}>
                  <div
                    className={`rounded-t-sm transition-colors ${isLast ? 'bg-olive-dark' : 'bg-olive'}`}
                    style={{ height: `${Math.max(pct, d.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Top products + retailers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Top products */}
        <div className="bg-white border border-off2 rounded-xl p-5">
          <h2 className="text-[14px] font-medium text-text mb-4">
            Top produkty <span className="text-text3 font-normal">({data.topProducts.length})</span>
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="text-[12px] text-text3 italic py-2">Žádné kliky.</p>
          ) : (
            <ul className="space-y-2">
              {data.topProducts.map((p, i) => (
                <li key={p.productId}>
                  <Link
                    href={`/olej/${p.slug}`}
                    target="_blank"
                    className="flex items-center gap-3 hover:bg-off/40 -mx-2 px-2 py-2 rounded transition-colors"
                  >
                    <span className="text-[11px] text-text3 tabular-nums w-5 text-right">
                      {i + 1}.
                    </span>
                    <div className="w-10 h-12 shrink-0 bg-white border border-off2 rounded flex items-center justify-center overflow-hidden">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-text3">—</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-text leading-tight line-clamp-1">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-text3 mt-0.5">
                        {p.uniqueIPs} unikátních · {p.score ? `Score ${p.score}` : 'bez Score'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[15px] font-semibold text-text tabular-nums">{p.clicks}</div>
                      <div className="text-[10px] text-olive-dark tabular-nums">
                        {fmtCZK(p.estCommission)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top retailers */}
        <div className="bg-white border border-off2 rounded-xl p-5">
          <h2 className="text-[14px] font-medium text-text mb-4">
            Top prodejci <span className="text-text3 font-normal">({data.topRetailers.length})</span>
          </h2>
          {data.topRetailers.length === 0 ? (
            <p className="text-[12px] text-text3 italic py-2">Žádné kliky.</p>
          ) : (
            <ul className="space-y-2">
              {data.topRetailers.map((r, i) => {
                const maxClicks = data.topRetailers[0].clicks
                const pct = (r.clicks / maxClicks) * 100
                return (
                  <li key={r.retailerId} className="flex items-center gap-3 px-2 py-2">
                    <span className="text-[11px] text-text3 tabular-nums w-5 text-right">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-[13px] font-medium text-text truncate">{r.name}</div>
                        <div className="text-[13px] tabular-nums text-text shrink-0">{r.clicks}</div>
                      </div>
                      <div className="h-1.5 bg-off rounded-full overflow-hidden">
                        <div className="h-full bg-olive rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-text3 mt-0.5">
                        odhad provize {fmtCZK(r.estCommission)}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Referrers + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-off2 rounded-xl p-5">
          <h2 className="text-[14px] font-medium text-text mb-4">Odkud přišli</h2>
          {data.byReferrer.length === 0 ? (
            <p className="text-[12px] text-text3 italic">Žádná data.</p>
          ) : (
            <ul className="space-y-2">
              {data.byReferrer.map((r) => {
                const pct = (r.count / data.total) * 100
                return (
                  <li key={r.source} className="flex items-center justify-between gap-3">
                    <div className="text-[13px] text-text truncate min-w-0">{r.source}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 bg-off rounded-full overflow-hidden">
                        <div className="h-full bg-olive rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[12px] tabular-nums text-text2 w-10 text-right">{r.count}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="bg-white border border-off2 rounded-xl p-5">
          <h2 className="text-[14px] font-medium text-text mb-4">Zařízení</h2>
          {data.byDevice.length === 0 ? (
            <p className="text-[12px] text-text3 italic">Žádná data.</p>
          ) : (
            <ul className="space-y-2">
              {data.byDevice.map((d) => {
                const pct = (d.count / data.total) * 100
                return (
                  <li key={d.device} className="flex items-center justify-between gap-3">
                    <div className="text-[13px] text-text truncate min-w-0">{d.device}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 bg-off rounded-full overflow-hidden">
                        <div className="h-full bg-olive rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[12px] tabular-nums text-text2 w-10 text-right">{d.count}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent feed */}
      <div className="bg-white border border-off2 rounded-xl p-5">
        <h2 className="text-[14px] font-medium text-text mb-4">
          Posledních {data.recent.length} kliků
        </h2>
        {data.recent.length === 0 ? (
          <p className="text-[12px] text-text3 italic py-2">Zatím žádné kliky v tomto období.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-text3 border-b border-off2">
                <th className="text-left pb-2 font-bold">Kdy</th>
                <th className="text-left pb-2 font-bold">Produkt</th>
                <th className="text-left pb-2 font-bold">Prodejce</th>
                <th className="text-left pb-2 font-bold">Odkud</th>
                <th className="text-left pb-2 font-bold">Zařízení</th>
                <th className="text-left pb-2 font-bold">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r, i) => (
                <tr key={i} className="border-b border-off2 last:border-0">
                  <td className="py-2 text-text3 whitespace-nowrap">{fmtRelative(r.ts)}</td>
                  <td className="py-2 text-text">
                    {r.productSlug ? (
                      <Link href={`/olej/${r.productSlug}`} target="_blank" className="hover:text-olive line-clamp-1">
                        {r.productName ?? '(odstraněn)'}
                      </Link>
                    ) : (
                      <span className="text-text3">—</span>
                    )}
                  </td>
                  <td className="py-2 text-text2">{r.retailerName ?? '—'}</td>
                  <td className="py-2 text-text3 truncate max-w-[200px]">{r.referrer}</td>
                  <td className="py-2 text-text3">{r.device}</td>
                  <td className="py-2 text-text3 font-mono text-[10px]">
                    {r.ipHash ? r.ipHash.slice(0, 8) + '…' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-off2 rounded-xl p-4">
      <div className="text-[11px] text-text2 mb-1">{label}</div>
      <div className="text-[24px] font-medium text-text tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-text3 mt-1 truncate">{sub}</div>}
    </div>
  )
}
