// Drafts list — všechny kampaně, filterable status.

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { DeleteDraftButton } from './delete-draft-button'

export const dynamic = 'force-dynamic'

interface DraftRow {
  id: string
  campaign_type: string
  subject: string
  preheader: string | null
  status: string
  generated_at: string
  approved_at: string | null
  recipient_count: number | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Schválené', color: 'bg-olive-bg text-olive-dark border-olive-border' },
  sending: { label: 'Odesílá se', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  sent: { label: 'Odesláno', color: 'bg-off text-text2 border-off2' },
  failed: { label: 'Selhalo', color: 'bg-red-50 text-red-700 border-red-200' },
  archived: { label: 'Archiv', color: 'bg-off text-text3 border-off2' },
}

const CAMPAIGN_LABELS: Record<string, string> = {
  weekly: '📅 Týdenní souhrn',
  deals: '📉 Slevy',
  harvest: '🇬🇷 Sezónní',
  alert: '🔔 Alert',
}

async function getDrafts(includeArchived: boolean): Promise<DraftRow[]> {
  try {
    const q = supabaseAdmin
      .from('newsletter_drafts')
      .select('id, campaign_type, subject, preheader, status, generated_at, approved_at, recipient_count')
      .order('generated_at', { ascending: false })
      .limit(100)
    const { data } = await (includeArchived ? q : q.neq('status', 'archived'))
    return (data ?? []) as DraftRow[]
  } catch {
    return []
  }
}

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>
}) {
  const { archived } = await searchParams
  const showArchived = archived === '1'
  const drafts = await getDrafts(showArchived)
  const pending = drafts.filter((d) => d.status === 'draft' || d.status === 'approved')
  const sent = drafts.filter((d) => d.status === 'sent')
  const failed = drafts.filter((d) => d.status === 'failed')
  const archivedCount = drafts.filter((d) => d.status === 'archived').length

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin/newsletter" className="text-olive">Newsletter</Link>
        {' › '}Drafty
      </div>

      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
            Drafty
          </h1>
          <p className="text-[13px] text-text3 mt-1">
            {pending.length} k revizi · {sent.length} odesláno · {failed.length} selhalo
            {showArchived && archivedCount > 0 ? ` · ${archivedCount} archivovaných` : ''}
          </p>
        </div>
        <Link
          href={showArchived ? '/admin/newsletter/drafts' : '/admin/newsletter/drafts?archived=1'}
          className="text-[12px] text-text2 hover:text-olive border border-off2 rounded-full px-3 py-1.5"
        >
          {showArchived ? '👁 Skrýt archiv' : '📦 Zobrazit i archivované'}
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="bg-white border border-off2 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">📭</div>
          <h2 className="text-[16px] font-medium text-text mb-1">Žádné drafty</h2>
          <p className="text-[13px] text-text3 mb-4 max-w-[380px] mx-auto">
            Drafty se vytvoří buď automaticky každou středu v 18:00 (cron) nebo
            ručně tlačítkem „Vygenerovat draft" v dashboardu.
          </p>
          <Link
            href="/admin/newsletter"
            className="inline-block bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium"
          >
            Zpět na dashboard
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-off2 rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-off">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Typ</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Subject</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Příjemců</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Vytvořeno</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => {
                const statusBadge = STATUS_LABELS[d.status] ?? { label: d.status, color: 'bg-off text-text2 border-off2' }
                return (
                  <tr key={d.id} className="border-t border-off2 hover:bg-off/40">
                    <td className="px-4 py-3 text-[12px] text-text2 whitespace-nowrap">
                      {CAMPAIGN_LABELS[d.campaign_type] ?? d.campaign_type}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text leading-tight line-clamp-1">{d.subject}</div>
                      {d.preheader && (
                        <div className="text-[11px] text-text3 mt-0.5 line-clamp-1">{d.preheader}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text2">
                      {d.recipient_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] text-text3 tabular-nums whitespace-nowrap">
                      {new Date(d.generated_at).toLocaleString('cs-CZ', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link href={`/admin/newsletter/drafts/${d.id}`} className="text-[12px] text-olive font-medium px-2">
                          Otevřít →
                        </Link>
                        <DeleteDraftButton draftId={d.id} status={d.status} subject={d.subject} />
                      </div>
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
