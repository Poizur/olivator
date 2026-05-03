// Admin dashboard — real-data overview with multiple data sources.
// Strategy: pokud affiliate clicks jsou 0, dashboard NESMÍ vypadat mrtvě.
// Mixujeme: clicks, subscribers, drafts, catalog health, activity.

import Link from 'next/link'
import { ArrowUpRight, ArrowUp, ArrowDown, Plus } from 'lucide-react'
import { getSiteStats, getAllRetailers } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'
import { BulkFetchImagesButton } from './bulk-fetch-images'
import { RegenerateAllButton } from '@/components/regenerate-all-button'

export const revalidate = 60
export const dynamic = 'force-dynamic'

interface DailyCount {
  date: string
  count: number
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function fmtCZK(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ')} Kč`
}

function fmtDayShort(s: string): string {
  const d = new Date(s)
  const days = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
  return days[d.getDay()] ?? ''
}

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'právě teď'
  if (diff < 3600) return `před ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `před ${Math.floor(diff / 3600)} h`
  return `před ${Math.floor(diff / 86400)} d`
}

function delta(curr: number, prev: number): { value: number; positive: boolean } | null {
  if (prev === 0 && curr === 0) return null
  if (prev === 0) return { value: 100, positive: true }
  const v = ((curr - prev) / prev) * 100
  return { value: Math.abs(Math.round(v)), positive: v >= 0 }
}

// ── Click stats ────────────────────────────────────────────────────────────

async function getClickStats(): Promise<{
  last7d: number
  prev7d: number
  byDay: DailyCount[]
  estCommission7d: number
}> {
  const now = new Date()
  const start7 = startOfDay(new Date(now.getTime() - 6 * 86400000))
  const startPrev = startOfDay(new Date(now.getTime() - 13 * 86400000))

  const { data: rows } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('clicked_at, product_id')
    .gte('clicked_at', startPrev.toISOString())

  const clicks = rows ?? []
  const last = clicks.filter((c) => new Date(c.clicked_at as string) >= start7)
  const prev = clicks.filter((c) => {
    const t = new Date(c.clicked_at as string)
    return t >= startPrev && t < start7
  })

  const byDay: DailyCount[] = []
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * 86400000))
    const next = new Date(day.getTime() + 86400000)
    const count = clicks.filter((c) => {
      const t = new Date(c.clicked_at as string)
      return t >= day && t < next
    }).length
    byDay.push({ date: day.toISOString().slice(0, 10), count })
  }

  // Commission estimate
  const ids = [...new Set(last.map((c) => c.product_id).filter(Boolean) as string[])]
  let estCommission7d = 0
  if (ids.length > 0) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, price, commission_pct')
      .in('product_id', ids)
    const byProduct = new Map<string, { price: number; pct: number }>()
    for (const o of offers ?? []) {
      const pid = o.product_id as string
      const price = Number(o.price) || 0
      const pct = Number(o.commission_pct) || 0
      const existing = byProduct.get(pid)
      if (!existing || price < existing.price) byProduct.set(pid, { price, pct })
    }
    for (const c of last) {
      if (!c.product_id) continue
      const o = byProduct.get(c.product_id as string)
      if (o) estCommission7d += o.price * (o.pct / 100)
    }
  }

  return { last7d: last.length, prev7d: prev.length, byDay, estCommission7d }
}

// ── Newsletter stats ───────────────────────────────────────────────────────

async function getNewsletterStats(): Promise<{
  totalSubscribers: number
  newSubsLast7d: number
  newSubsPrev7d: number
  signupsByDay: DailyCount[]
  draftsCount: number
  sentCount: number
  recentCampaigns: Array<{
    id: string
    subject: string
    approved_at: string | null
    sent: number
    opened: number
    clicked: number
    openRate: number
  }>
  lastSentOpenRate: number | null
}> {
  const now = new Date()
  const start7 = startOfDay(new Date(now.getTime() - 6 * 86400000))
  const start30 = startOfDay(new Date(now.getTime() - 29 * 86400000))
  const startPrev = startOfDay(new Date(now.getTime() - 13 * 86400000))

  // Subscribers
  const subscribersRes = await supabaseAdmin
    .from('newsletter_signups')
    .select('id, created_at', { count: 'exact' })
    .eq('confirmed', true)
    .eq('unsubscribed', false)
    .gte('created_at', start30.toISOString())

  const totalSubsRes = await supabaseAdmin
    .from('newsletter_signups')
    .select('*', { count: 'exact', head: true })
    .eq('confirmed', true)
    .eq('unsubscribed', false)

  const recentSubs = subscribersRes.data ?? []
  const newSubsLast7d = recentSubs.filter((s) => new Date(s.created_at as string) >= start7).length
  const newSubsPrev7d = recentSubs.filter((s) => {
    const t = new Date(s.created_at as string)
    return t >= startPrev && t < start7
  }).length

  // Signups by day (last 30)
  const signupsByDay: DailyCount[] = []
  for (let i = 29; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * 86400000))
    const next = new Date(day.getTime() + 86400000)
    const count = recentSubs.filter((s) => {
      const t = new Date(s.created_at as string)
      return t >= day && t < next
    }).length
    signupsByDay.push({ date: day.toISOString().slice(0, 10), count })
  }

  // Drafts + sends
  const draftsRes = await supabaseAdmin
    .from('newsletter_drafts')
    .select('id, subject, status, approved_at, recipient_count')
    .in('status', ['draft', 'approved'])
    .order('generated_at', { ascending: false })
    .limit(10)

  const sentRes = await supabaseAdmin
    .from('newsletter_drafts')
    .select('id, subject, approved_at, recipient_count')
    .eq('status', 'sent')
    .order('approved_at', { ascending: false })
    .limit(3)

  // Stats per recent sent campaign
  const recentCampaigns: Array<{
    id: string
    subject: string
    approved_at: string | null
    sent: number
    opened: number
    clicked: number
    openRate: number
  }> = []

  for (const d of sentRes.data ?? []) {
    const { data: sends } = await supabaseAdmin
      .from('newsletter_sends')
      .select('status, opened_at, first_clicked_at')
      .eq('draft_id', d.id)

    const all = sends ?? []
    const sent = all.filter((s) => s.status === 'sent' || s.status === 'delivered').length
    const opened = all.filter((s) => s.opened_at != null).length
    const clicked = all.filter((s) => s.first_clicked_at != null).length
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
    recentCampaigns.push({
      id: d.id as string,
      subject: d.subject as string,
      approved_at: d.approved_at as string | null,
      sent,
      opened,
      clicked,
      openRate,
    })
  }

  return {
    totalSubscribers: totalSubsRes.count ?? 0,
    newSubsLast7d,
    newSubsPrev7d,
    signupsByDay,
    draftsCount: (draftsRes.data ?? []).length,
    sentCount: (sentRes.data ?? []).length,
    recentCampaigns,
    lastSentOpenRate: recentCampaigns[0]?.openRate ?? null,
  }
}

// ── Catalog health ─────────────────────────────────────────────────────────

async function getCatalogHealth(): Promise<{
  totalActive: number
  withImage: number
  withOffer: number
  withDescription: number
  withScore: number
  withAffiliate: number
  totalOffers: number
}> {
  // Pomocí jednoduchých head:true count queries — bez wrapperu typu safeCount
  // (Supabase TS typing pro head:true s filtry je flaky, jednodušší přímo).
  const totalActiveRes = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const withImageRes = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('image_url', 'is', null)

  const withDescriptionRes = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('description_long', 'is', null)

  const withScoreRes = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('olivator_score', 'is', null)

  const totalOffersRes = await supabaseAdmin
    .from('product_offers')
    .select('*', { count: 'exact', head: true })

  const withAffiliateRes = await supabaseAdmin
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
    .not('affiliate_url', 'is', null)
    .neq('affiliate_url', '')

  // Distinct count produktů s aspoň 1 nabídkou
  const offersWithProductId = await supabaseAdmin
    .from('product_offers')
    .select('product_id')
  const withOfferCount = new Set(
    (offersWithProductId.data ?? []).map((o) => o.product_id as string)
  ).size

  return {
    totalActive: totalActiveRes.count ?? 0,
    withImage: withImageRes.count ?? 0,
    withOffer: withOfferCount,
    withDescription: withDescriptionRes.count ?? 0,
    withScore: withScoreRes.count ?? 0,
    withAffiliate: withAffiliateRes.count ?? 0,
    totalOffers: totalOffersRes.count ?? 0,
  }
}

// ── Activity feed (extended) ───────────────────────────────────────────────

async function getActivityFeed() {
  const [discoveryRes, bulkRes, managerRes, draftsRes, signupsRes] = await Promise.all([
    supabaseAdmin
      .from('discovery_candidates')
      .select('id, suggested_name, source_domain, scraped_at, status')
      .order('scraped_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('bulk_jobs')
      .select('id, type, status, total, created_at')
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('manager_reports')
      .select('id, generated_at')
      .order('generated_at', { ascending: false })
      .limit(2),
    supabaseAdmin
      .from('newsletter_drafts')
      .select('id, subject, status, generated_at, approved_at')
      .order('generated_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('newsletter_signups')
      .select('email, source, created_at')
      .eq('confirmed', true)
      .eq('unsubscribed', false)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  type FeedItem = {
    kind: string
    ts: string
    title: string
    subtitle?: string
    tone: 'olive' | 'amber' | 'red' | 'blue'
    href?: string
  }
  const items: FeedItem[] = []

  for (const d of discoveryRes.data ?? []) {
    items.push({
      kind: 'discovery',
      ts: d.scraped_at as string,
      title: `Nový kandidát: ${d.suggested_name ?? '(bez názvu)'}`,
      subtitle: (d.source_domain as string) ?? '—',
      tone: 'olive',
      href: '/admin/discovery',
    })
  }
  for (const b of bulkRes.data ?? []) {
    items.push({
      kind: 'bulk',
      ts: b.created_at as string,
      title: `Bulk job: ${b.type}`,
      subtitle: `${b.total} položek · ${b.status}`,
      tone: b.status === 'failed' ? 'red' : 'amber',
      href: '/admin/bulk-jobs',
    })
  }
  for (const m of managerRes.data ?? []) {
    items.push({
      kind: 'manager',
      ts: m.generated_at as string,
      title: 'Manager report vygenerován',
      tone: 'olive',
      href: '/admin/manager',
    })
  }
  for (const d of draftsRes.data ?? []) {
    const status = d.status as string
    items.push({
      kind: 'newsletter',
      ts: (d.approved_at as string | null) ?? (d.generated_at as string),
      title:
        status === 'sent'
          ? `Newsletter odeslán: ${d.subject}`
          : status === 'approved'
          ? `Newsletter schválen: ${d.subject}`
          : `Nový draft newsletteru: ${d.subject}`,
      subtitle: `status: ${status}`,
      tone: status === 'sent' ? 'olive' : 'blue',
      href: `/admin/newsletter/drafts/${d.id}`,
    })
  }
  for (const s of signupsRes.data ?? []) {
    items.push({
      kind: 'signup',
      ts: s.created_at as string,
      title: `Nový subscriber`,
      subtitle: `${s.email} · ${(s.source as string) ?? 'unknown'}`,
      tone: 'olive',
      href: '/admin/newsletter/subscribers',
    })
  }

  return items
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 10)
}

async function getNeedsAttention() {
  const [draftsRes, missingTplRes, missingAffiliateRes, draftNewslettersRes] = await Promise.all([
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabaseAdmin.from('retailers').select('id, name, base_tracking_url'),
    supabaseAdmin
      .from('product_offers')
      .select('id', { count: 'exact', head: true })
      .or('affiliate_url.is.null,affiliate_url.eq.'),
    supabaseAdmin
      .from('newsletter_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft'),
  ])

  return {
    drafts: draftsRes.count ?? 0,
    missingTemplates: (missingTplRes.data ?? []).filter(
      (r: Record<string, unknown>) => !r.base_tracking_url
    ),
    offersWithoutAffiliate: missingAffiliateRes.count ?? 0,
    pendingNewsletters: draftNewslettersRes.count ?? 0,
  }
}

export default async function AdminDashboardPage() {
  const [stats, retailers, clickStats, newsletterStats, catalogHealth, activity, attention] = await Promise.all([
    getSiteStats(),
    getAllRetailers(),
    getClickStats(),
    getNewsletterStats(),
    getCatalogHealth(),
    getActivityFeed(),
    getNeedsAttention(),
  ])

  const clickDelta = delta(clickStats.last7d, clickStats.prev7d)
  const subsDelta = delta(newsletterStats.newSubsLast7d, newsletterStats.newSubsPrev7d)
  const maxClickBar = Math.max(1, ...clickStats.byDay.map((d) => d.count))
  const maxSignupBar = Math.max(1, ...newsletterStats.signupsByDay.map((d) => d.count))

  // Vytvořím 4 KPI cards — mix toho co máme
  const cards: Array<{
    label: string
    value: string
    sub: string
    delta?: ReturnType<typeof delta>
    href: string
    accent?: 'olive' | 'amber'
  }> = [
    {
      label: 'Aktivní produkty',
      value: stats.totalProducts.toString(),
      sub:
        attention.drafts > 0
          ? `+ ${attention.drafts} v draftu`
          : `${catalogHealth.totalOffers} nabídek`,
      href: '/admin/products',
      accent: attention.drafts > 0 ? 'amber' : undefined,
    },
    {
      label: 'Subscribers',
      value: newsletterStats.totalSubscribers.toString(),
      sub: subsDelta
        ? `${newsletterStats.newSubsLast7d} nových za 7 dní`
        : `${newsletterStats.newSubsLast7d} za 7 dní`,
      delta: subsDelta,
      href: '/admin/newsletter/subscribers',
      accent: 'olive',
    },
    {
      label: 'Prokliky · 7 dní',
      value: clickStats.last7d.toString(),
      sub: clickDelta ? 'vs minulý týden' : 'zatím bez kliků',
      delta: clickDelta,
      href: '/admin/analytics?range=7',
    },
    newsletterStats.lastSentOpenRate !== null
      ? {
          label: 'Open rate (poslední)',
          value: `${newsletterStats.lastSentOpenRate} %`,
          sub: `${newsletterStats.recentCampaigns[0]?.opened ?? 0} z ${newsletterStats.recentCampaigns[0]?.sent ?? 0} otevřeno`,
          href: '/admin/newsletter/sends',
          accent: 'olive',
        }
      : {
          label: 'Provize (odhad)',
          value: fmtCZK(clickStats.estCommission7d),
          sub: 'cena × % provize z kliků',
          href: '/admin/retailers',
        },
  ]

  const today = new Date().toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1.5">
            Přehled
          </h1>
          <p className="text-[13px] text-text3">
            <span className="capitalize">{today}</span>
            <span className="mx-1.5 text-text3">·</span>
            posledních 7 dní
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {attention.pendingNewsletters > 0 && (
            <Link
              href="/admin/newsletter/drafts"
              className="text-[13px] text-olive-dark border border-olive-border bg-olive-bg/40 hover:bg-olive-bg rounded-md px-3.5 py-2 transition-colors font-medium"
            >
              📧 Schválit newsletter <span className="opacity-60">({attention.pendingNewsletters})</span>
            </Link>
          )}
          {attention.drafts > 0 && (
            <Link
              href="/admin/products?status=draft"
              className="text-[13px] text-text2 border border-off2 bg-white hover:bg-off rounded-md px-3.5 py-2 transition-colors"
            >
              Drafty produktů <span className="text-text3">({attention.drafts})</span>
            </Link>
          )}
          <Link
            href="/admin/products/import"
            className="inline-flex items-center gap-1.5 text-[13px] text-text border border-off2 bg-white hover:bg-off2 rounded-md px-3.5 py-2 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Přidat produkt
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`group bg-white border rounded-xl p-5 transition-colors ${
              c.accent === 'olive'
                ? 'border-olive-border hover:border-olive'
                : c.accent === 'amber'
                ? 'border-terra/30 hover:border-terra/60'
                : 'border-off2 hover:border-off2'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-[12px] text-text2">{c.label}</span>
              <ArrowUpRight
                size={14}
                strokeWidth={1.75}
                className="text-text3 group-hover:text-text2 transition-colors"
              />
            </div>
            <div className="text-[40px] font-medium text-text tabular-nums tracking-tight leading-none mb-3">
              {c.value}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {c.delta && (
                <span
                  className={`inline-flex items-center gap-0.5 font-medium ${
                    c.delta.positive ? 'text-olive-dark' : 'text-red-700'
                  }`}
                >
                  {c.delta.positive ? (
                    <ArrowUp size={10} strokeWidth={2.5} />
                  ) : (
                    <ArrowDown size={10} strokeWidth={2.5} />
                  )}
                  {c.delta.value} %
                </span>
              )}
              <span className="text-text3">{c.sub}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row — signups (30d) + clicks (7d) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Subscriber growth — 30 days */}
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-medium text-text">Subscribers · 30 dní</h2>
              <p className="text-[11px] text-text3 mt-0.5">
                {newsletterStats.signupsByDay.reduce((s, d) => s + d.count, 0)} přihlášení
              </p>
            </div>
            <Link
              href="/admin/newsletter/subscribers"
              className="text-[12px] text-olive hover:text-olive-dark transition-colors"
            >
              Detail →
            </Link>
          </div>
          <div className="flex items-end gap-[2px] h-[120px]">
            {newsletterStats.signupsByDay.map((d, i) => {
              const pct = (d.count / maxSignupBar) * 100
              return (
                <div
                  key={d.date}
                  className="flex-1 relative group"
                  title={`${d.date}: ${d.count}`}
                >
                  <div
                    className="bg-olive rounded-t-sm hover:bg-olive-dark transition-colors"
                    style={{ height: `${Math.max(pct, d.count > 0 ? 5 : 0)}%` }}
                  />
                  {(i === 0 || i === newsletterStats.signupsByDay.length - 1 || i === 14) && (
                    <div className="text-[9px] text-text3 absolute -bottom-4 left-1/2 -translate-x-1/2 tabular-nums">
                      {d.date.slice(8, 10)}.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Click chart — 7 days */}
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-medium text-text">Prokliky · 7 dní</h2>
              <p className="text-[11px] text-text3 mt-0.5">{clickStats.last7d} celkem</p>
            </div>
            <Link
              href="/admin/analytics?range=7"
              className="text-[12px] text-olive hover:text-olive-dark transition-colors"
            >
              Detail →
            </Link>
          </div>
          <div className="flex items-end gap-2 h-[120px]">
            {clickStats.byDay.map((d, i) => {
              const pct = (d.count / maxClickBar) * 100
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex-1 w-full flex items-end relative">
                    <div
                      className="w-full rounded-t-sm bg-olive"
                      style={{
                        height: `${pct}%`,
                        minHeight: d.count > 0 ? '3px' : '0',
                      }}
                      title={`${d.date}: ${d.count} kliků`}
                    />
                  </div>
                  <div className="text-[10px] text-text3 tabular-nums">{fmtDayShort(d.date)}</div>
                  <div
                    className={`text-[11px] tabular-nums ${
                      i === clickStats.byDay.length - 1 ? 'text-text font-medium' : 'text-text2'
                    }`}
                  >
                    {d.count}
                  </div>
                </div>
              )
            })}
          </div>
          {clickStats.last7d === 0 && (
            <p className="text-[11px] text-text3 italic mt-2">
              Zatím žádné kliky. Affiliate analytics naběhne když uživatelé začnou klikat na CTA tlačítka.
            </p>
          )}
        </div>
      </div>

      {/* Newsletter performance + Catalog health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Newsletter performance */}
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-medium text-text">Newsletter performance</h2>
              <p className="text-[11px] text-text3 mt-0.5">
                {newsletterStats.recentCampaigns.length} nedávných kampaní
              </p>
            </div>
            <Link
              href="/admin/newsletter/sends"
              className="text-[12px] text-olive hover:text-olive-dark transition-colors"
            >
              Vše →
            </Link>
          </div>
          {newsletterStats.recentCampaigns.length === 0 ? (
            <div className="text-[12px] text-text3 italic py-6 text-center">
              {attention.pendingNewsletters > 0 ? (
                <>
                  Žádná odeslaná kampaň zatím.{' '}
                  <Link href="/admin/newsletter/drafts" className="text-olive">
                    Schvalit draft →
                  </Link>
                </>
              ) : (
                <>
                  Žádná odeslaná kampaň.{' '}
                  <Link href="/admin/newsletter" className="text-olive">
                    Vygenerovat první →
                  </Link>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {newsletterStats.recentCampaigns.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/newsletter/drafts/${c.id}`}
                    className="block hover:bg-off/40 -mx-2 px-2 py-1.5 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] text-text leading-tight line-clamp-1 flex-1">
                        {c.subject}
                      </div>
                      <div className="text-[11px] tabular-nums whitespace-nowrap">
                        <span className="text-olive-dark font-medium">{c.openRate}%</span>
                        <span className="text-text3 ml-1.5">open</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-text3 mt-0.5">
                      {c.sent} doručeno · {c.opened} otevřeno · {c.clicked} klik(ů)
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Catalog health */}
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-medium text-text">Stav katalogu</h2>
              <p className="text-[11px] text-text3 mt-0.5">
                {catalogHealth.totalActive} aktivních produktů
              </p>
            </div>
            <Link
              href="/admin/quality"
              className="text-[12px] text-olive hover:text-olive-dark transition-colors"
            >
              Kvalita →
            </Link>
          </div>
          <ul className="space-y-2.5">
            {[
              { label: 'S obrázkem', count: catalogHealth.withImage, total: catalogHealth.totalActive },
              { label: 'S nabídkou', count: catalogHealth.withOffer, total: catalogHealth.totalActive },
              { label: 'Se Score', count: catalogHealth.withScore, total: catalogHealth.totalActive },
              { label: 'S popisem', count: catalogHealth.withDescription, total: catalogHealth.totalActive },
              {
                label: 'Affiliate URL',
                count: catalogHealth.withAffiliate,
                total: catalogHealth.totalOffers,
                sub: 'z nabídek',
              },
            ].map((row) => {
              const pct = row.total > 0 ? Math.round((row.count / row.total) * 100) : 0
              const tone = pct >= 90 ? 'olive' : pct >= 60 ? 'amber' : 'red'
              return (
                <li key={row.label}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-text2">{row.label}</span>
                    <span className="text-text tabular-nums">
                      <strong>{row.count}</strong>
                      <span className="text-text3 ml-1">/ {row.total} {row.sub ?? ''}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-off rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        tone === 'olive' ? 'bg-olive' : tone === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Activity feed (full width) */}
      <div className="bg-white border border-off2 rounded-xl p-5 mb-3">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-medium text-text">Aktivita systému</h2>
          <span className="text-[11px] text-text3">posledních {activity.length} událostí</span>
        </div>
        {activity.length === 0 ? (
          <p className="text-[12px] text-text3 italic py-2">Zatím žádná aktivita.</p>
        ) : (
          <ul className="space-y-3">
            {activity.map((item, i) => {
              const dot =
                item.tone === 'red'
                  ? 'bg-red-500'
                  : item.tone === 'amber'
                  ? 'bg-amber-500'
                  : item.tone === 'blue'
                  ? 'bg-blue-500'
                  : 'bg-emerald-500'
              const inner = (
                <>
                  <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text font-medium leading-snug">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-text3 mt-0.5">
                      {item.subtitle ? <>{item.subtitle} · </> : null}
                      {fmtRelative(item.ts)}
                    </div>
                  </div>
                </>
              )
              return (
                <li key={i}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 hover:bg-off/40 -mx-2 px-2 py-1 rounded transition-colors"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Needs attention */}
      {(attention.drafts > 0 ||
        attention.missingTemplates.length > 0 ||
        attention.offersWithoutAffiliate > 0 ||
        attention.pendingNewsletters > 0) && (
        <div className="bg-white border border-off2 rounded-xl p-5 mb-3">
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-3">
            — Vyžaduje pozornost
          </div>
          <ul className="divide-y divide-off2">
            {attention.pendingNewsletters > 0 && (
              <li className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] text-text">
                    {attention.pendingNewsletters} draftů newsletteru čeká na schválení
                  </div>
                  <div className="text-[11px] text-text3 mt-0.5">
                    Schval (nebo smaž) drafty před tím, než cron pošle kampaň
                  </div>
                </div>
                <Link
                  href="/admin/newsletter/drafts"
                  className="text-[12px] text-olive hover:text-olive-dark font-medium transition-colors whitespace-nowrap"
                >
                  Otevřít →
                </Link>
              </li>
            )}
            {attention.drafts > 0 && (
              <li className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] text-text">
                    {attention.drafts} produktů v draftu
                  </div>
                  <div className="text-[11px] text-text3 mt-0.5">
                    Schval nebo zamítni před tím, než se objeví na webu
                  </div>
                </div>
                <Link
                  href="/admin/products?status=draft"
                  className="text-[12px] text-olive hover:text-olive-dark font-medium transition-colors whitespace-nowrap"
                >
                  Otevřít →
                </Link>
              </li>
            )}
            {attention.missingTemplates.length > 0 && (
              <li className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-text">
                    {attention.missingTemplates.length} prodejců bez affiliate šablony
                  </div>
                  <div className="text-[11px] text-text3 mt-0.5 truncate">
                    {attention.missingTemplates
                      .map((r: Record<string, unknown>) => r.name as string)
                      .join(', ')}
                  </div>
                </div>
                <Link
                  href="/admin/retailers"
                  className="text-[12px] text-olive hover:text-olive-dark font-medium transition-colors whitespace-nowrap"
                >
                  Otevřít →
                </Link>
              </li>
            )}
            {attention.offersWithoutAffiliate > 0 && (
              <li className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] text-text">
                    {attention.offersWithoutAffiliate} nabídek bez affiliate URL
                  </div>
                  <div className="text-[11px] text-text3 mt-0.5">
                    Bez affiliate URL nedostáváš provizi z prokliku
                  </div>
                </div>
                <Link
                  href="/admin/retailers"
                  className="text-[12px] text-olive hover:text-olive-dark font-medium transition-colors whitespace-nowrap"
                >
                  Opravit →
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Master regen — kompletní obsah napříč webem */}
      <div className="bg-olive-bg/30 border border-olive-border rounded-xl p-5 mb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[14px] font-medium text-olive-dark">
              ✨ Vygeneruj kompletní obsah napříč webem
            </h2>
            <p className="text-[12px] text-olive-dark/80 mt-1 leading-snug max-w-[640px]">
              Pro VŠECHNY regiony, značky a odrůdy: editorial obsah + TL;DR + terroir/timeline/pairing
              + FAQ. Smaže duplikáty, nastaví vše na status=active. Trvá ~10-15 min, $1-2 Claude API.
            </p>
          </div>
          <RegenerateAllButton
            entityType="all"
            label="Vygeneruj VŠE a publikuj"
            includeExtras={true}
            setActive={true}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-off2 rounded-xl p-5">
        <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-3">
          — Rychlé akce
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/newsletter"
            className="text-[12px] text-text2 hover:text-text border border-off2 rounded-md px-3.5 py-1.5 transition-colors"
          >
            📧 Newsletter
          </Link>
          <Link
            href="/admin/discovery"
            className="text-[12px] text-text2 hover:text-text border border-off2 rounded-md px-3.5 py-1.5 transition-colors"
          >
            Discovery návrhy
          </Link>
          <Link
            href="/admin/retailers/new"
            className="text-[12px] text-text2 hover:text-text border border-off2 rounded-md px-3.5 py-1.5 transition-colors"
          >
            + Nový prodejce
          </Link>
          <Link
            href="/admin/quality"
            className="text-[12px] text-text2 hover:text-text border border-off2 rounded-md px-3.5 py-1.5 transition-colors"
          >
            Kvalita dat
          </Link>
          <BulkFetchImagesButton />
        </div>
      </div>
    </div>
  )
}
