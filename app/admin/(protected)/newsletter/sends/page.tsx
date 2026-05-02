// Sends history — odeslané kampaně s metrikami (open rate, click rate).

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface CampaignStats {
  draftId: string
  subject: string
  campaign_type: string
  approved_at: string | null
  recipient_count: number | null
  delivered: number
  opened: number
  clicked: number
  bounced: number
}

async function getCampaigns(): Promise<CampaignStats[]> {
  try {
    // Vezmi všechny sent drafty
    const { data: drafts } = await supabaseAdmin
      .from('newsletter_drafts')
      .select('id, subject, campaign_type, approved_at, recipient_count')
      .eq('status', 'sent')
      .order('approved_at', { ascending: false })
      .limit(50)

    if (!drafts) return []

    // Pro každý spočti stats z newsletter_sends
    const out: CampaignStats[] = []
    for (const d of drafts) {
      const { data: sends } = await supabaseAdmin
        .from('newsletter_sends')
        .select('status, opened_at, first_clicked_at')
        .eq('draft_id', d.id)

      const all = sends ?? []
      out.push({
        draftId: d.id as string,
        subject: d.subject as string,
        campaign_type: d.campaign_type as string,
        approved_at: d.approved_at as string | null,
        recipient_count: d.recipient_count as number | null,
        delivered: all.filter((s) => s.status === 'delivered' || s.status === 'sent').length,
        opened: all.filter((s) => s.opened_at != null).length,
        clicked: all.filter((s) => s.first_clicked_at != null).length,
        bounced: all.filter((s) => s.status === 'bounced').length,
      })
    }
    return out
  } catch {
    return []
  }
}

function pct(num: number, total: number): string {
  if (total === 0) return '—'
  return `${Math.round((num / total) * 100)}%`
}

export default async function SendsHistoryPage() {
  const campaigns = await getCampaigns()

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin/newsletter" className="text-olive">Newsletter</Link>
        {' › '}Historie odeslaných
      </div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          Historie kampaní
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          {campaigns.length} odeslaných · benchmark CZ: open rate 25-35 %, click rate 3-8 %
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white border border-off2 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-[16px] font-medium text-text mb-1">Žádné odeslané kampaně</h2>
          <p className="text-[13px] text-text3 max-w-[400px] mx-auto">
            Až pošleš první newsletter, uvidíš tu open rate, click rate a další metriky.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-off2 rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-off">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Kampaň</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Doručeno</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Open</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Click</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Bounce</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Datum</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const sent = c.recipient_count ?? c.delivered
                return (
                  <tr key={c.draftId} className="border-t border-off2 hover:bg-off/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/newsletter/drafts/${c.draftId}`}
                        className="font-medium text-text hover:text-olive line-clamp-1"
                      >
                        {c.subject}
                      </Link>
                      <div className="text-[10px] text-text3 mt-0.5">
                        {c.campaign_type}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text">
                      {c.delivered}
                      <div className="text-[10px] text-text3">/ {sent}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-text tabular-nums">
                        {pct(c.opened, c.delivered)}
                      </div>
                      <div className="text-[10px] text-text3 tabular-nums">{c.opened}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-text tabular-nums">
                        {pct(c.clicked, c.delivered)}
                      </div>
                      <div className="text-[10px] text-text3 tabular-nums">{c.clicked}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-text3 tabular-nums">
                      {c.bounced > 0 ? c.bounced : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] text-text3 tabular-nums whitespace-nowrap">
                      {c.approved_at
                        ? new Date(c.approved_at).toLocaleDateString('cs-CZ', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
