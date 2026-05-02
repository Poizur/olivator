// Newsletter dashboard — entrypoint pro správu newsletter systému.

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminBlock } from '@/components/admin-block'
import { GenerateDraftButton } from './_actions/generate-draft-button'

export const dynamic = 'force-dynamic'

interface Stats {
  totalSubscribers: number
  activeSubscribers: number
  draftsPending: number
  draftsApproved: number
  totalSent: number
  last7dSent: number
  totalAlerts: number
  triggeredAlerts: number
}

async function safeCount(table: string, filterFn?: (q: any) => any): Promise<number> {
  try {
    let q: any = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    if (filterFn) q = filterFn(q)
    const r = await q
    return r.count ?? 0
  } catch {
    return 0
  }
}

async function getStats(): Promise<Stats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const [
    totalSubscribers,
    activeSubscribers,
    draftsPending,
    draftsApproved,
    totalSent,
    last7dSent,
    totalAlerts,
    triggeredAlerts,
  ] = await Promise.all([
    safeCount('newsletter_signups'),
    safeCount('newsletter_signups', (q) => q.eq('confirmed', true).eq('unsubscribed', false)),
    safeCount('newsletter_drafts', (q) => q.eq('status', 'draft')),
    safeCount('newsletter_drafts', (q) => q.eq('status', 'approved')),
    safeCount('newsletter_drafts', (q) => q.eq('status', 'sent')),
    safeCount('newsletter_drafts', (q) => q.eq('status', 'sent').gte('approved_at', sevenDaysAgo)),
    safeCount('price_alerts'),
    safeCount('price_alerts', (q) => q.eq('status', 'triggered')),
  ])

  return {
    totalSubscribers, activeSubscribers, draftsPending, draftsApproved,
    totalSent, last7dSent, totalAlerts, triggeredAlerts,
  }
}

export default async function NewsletterDashboard() {
  const stats = await getStats()

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">Newsletter</h1>
        <p className="text-[13px] text-text3 mt-1">Týdenní souhrn · cenové alerty · slevové kampaně</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Aktivní subscribers" value={stats.activeSubscribers} hint={`${stats.totalSubscribers} celkem`} tone="olive" />
        <KpiCard label="Drafty na schválení" value={stats.draftsPending} hint={stats.draftsApproved > 0 ? `+${stats.draftsApproved} schválené` : 'k revizi'} tone={stats.draftsPending > 0 ? 'amber' : 'neutral'} />
        <KpiCard label="Odesláno za 7 dní" value={stats.last7dSent} hint={`${stats.totalSent} celkem`} tone="neutral" />
        <KpiCard label="Cenové alerty" value={stats.totalAlerts} hint={`${stats.triggeredAlerts} už spuštěné`} tone="neutral" />
      </div>

      <div className="space-y-6">
        <AdminBlock number={1} icon="⚡" title="Rychlé akce" description="Co můžeš udělat ručně mimo automatizaci.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GenerateDraftButton />
            <Link href="/admin/newsletter/drafts" className="border border-off2 rounded-xl p-4 hover:border-olive transition-colors block">
              <div className="text-[13px] font-medium text-text mb-1">📝 Drafty ({stats.draftsPending + stats.draftsApproved})</div>
              <div className="text-[11px] text-text3 leading-snug">Auto-generated kampaně k revizi/odeslání</div>
            </Link>
            <Link href="/admin/newsletter/sends" className="border border-off2 rounded-xl p-4 hover:border-olive transition-colors block">
              <div className="text-[13px] font-medium text-text mb-1">📊 Historie odeslaných ({stats.totalSent})</div>
              <div className="text-[11px] text-text3 leading-snug">Open rate, click rate, attribution</div>
            </Link>
            <Link href="/admin/newsletter/subscribers" className="border border-off2 rounded-xl p-4 hover:border-olive transition-colors block">
              <div className="text-[13px] font-medium text-text mb-1">👥 Subscribers ({stats.activeSubscribers})</div>
              <div className="text-[11px] text-text3 leading-snug">Aktivní seznam, preference, zdroje</div>
            </Link>
          </div>
        </AdminBlock>

        <AdminBlock number={2} icon="⚙️" title="Nastavení a obsah" description="Automatizace, knowledge base, vysvětlení flow.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/admin/newsletter/settings" className="border border-off2 rounded-xl p-4 hover:border-olive transition-colors block">
              <div className="text-[13px] font-medium text-text mb-1">🎛 Automatizace</div>
              <div className="text-[11px] text-text3 leading-snug">Zapni/vypni typy kampaní + schedule</div>
            </Link>
            <Link href="/admin/newsletter/facts" className="border border-off2 rounded-xl p-4 hover:border-olive transition-colors block">
              <div className="text-[13px] font-medium text-text mb-1">💡 Educational facts</div>
              <div className="text-[11px] text-text3 leading-snug">Knihovna „Věděli jste?" pro rotaci v emailech</div>
            </Link>
            <Link href="/admin/newsletter/legend" className="border border-olive-border bg-olive-bg/30 rounded-xl p-4 hover:bg-olive-bg/50 transition-colors block">
              <div className="text-[13px] font-medium text-olive-dark mb-1">📚 Jak to funguje</div>
              <div className="text-[11px] text-olive leading-snug">Vysvětlení automatizací — co se kdy děje</div>
            </Link>
          </div>
        </AdminBlock>
      </div>
    </div>
  )
}

function KpiCard({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone: 'olive' | 'amber' | 'neutral' }) {
  const colors = {
    olive: 'border-olive-border bg-olive-bg/30',
    amber: 'border-terra/30 bg-amber-50',
    neutral: 'border-off2 bg-white',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[tone]}`}>
      <div className="text-[10px] uppercase tracking-widest font-medium text-text3 mb-1">{label}</div>
      <div className="font-[family-name:var(--font-display)] text-2xl font-normal text-text leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-text3 mt-1">{hint}</div>}
    </div>
  )
}
