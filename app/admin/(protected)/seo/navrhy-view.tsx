// Návrhy tab — denní audit najde co je špatně, admin schvaluje opravy.
// Skupiny per rule, akce: ✓ Opravit | ✕ Ignorovat | bulk "Opravit všechno"

import { supabaseAdmin } from '@/lib/supabase'
import { ProposalRow } from './proposal-row'
import { ProposalBulkButton } from './proposal-bulk-button'
import { RunProposalAuditButton } from './run-proposal-audit-button'

export const dynamic = 'force-dynamic'

interface Proposal {
  id: string
  rule_id: string
  severity: 'low' | 'medium' | 'high'
  target_type: string
  target_id: string | null
  target_slug: string | null
  target_label: string
  title: string
  reason: string | null
  suggested_action: Record<string, unknown>
  status: string
  detected_at: string
  resolution_note: string | null
  resolved_at: string | null
}

const RULE_LABEL: Record<string, { emoji: string; label: string }> = {
  product_no_image:           { emoji: '🖼️', label: 'Produkty bez obrázku' },
  offer_no_affiliate:         { emoji: '🔗', label: 'Nabídky bez affiliate URL' },
  article_no_hero:            { emoji: '📰', label: 'Články bez hero image' },
  recipe_no_hero:             { emoji: '🍽️', label: 'Recepty bez hero image' },
  brand_incomplete:           { emoji: '🏷️', label: 'Brandy s nekompletními daty' },
  brand_duplicate:            { emoji: '👯', label: 'Duplicitní brandy' },
  brand_no_country:           { emoji: '🌍', label: 'Brandy bez country_code' },
  product_no_description:     { emoji: '📝', label: 'Produkty bez popisu' },
  inactive_with_stock:        { emoji: '⚠️', label: 'Inactive produkty s offer in_stock' },
}

const SEVERITY_TONE: Record<string, string> = {
  high:   'border-red-200 bg-red-50',
  medium: 'border-amber-200 bg-amber-50',
  low:    'border-off2 bg-off',
}

export async function NavrhyView() {
  const { data: pending } = await supabaseAdmin
    .from('seo_proposals')
    .select('*')
    .eq('status', 'pending')
    .order('severity', { ascending: false })
    .order('detected_at', { ascending: false })

  const { data: recent } = await supabaseAdmin
    .from('seo_proposals')
    .select('id, rule_id, target_label, status, resolution_note, resolved_at')
    .neq('status', 'pending')
    .order('resolved_at', { ascending: false })
    .limit(20)

  const proposals = (pending ?? []) as Proposal[]
  const recentResolved = (recent ?? []) as Array<{ id: string; rule_id: string; target_label: string; status: string; resolution_note: string | null; resolved_at: string | null }>

  // Group by rule_id
  const byRule = new Map<string, Proposal[]>()
  for (const p of proposals) {
    if (!byRule.has(p.rule_id)) byRule.set(p.rule_id, [])
    byRule.get(p.rule_id)!.push(p)
  }

  // Severity counters
  const high = proposals.filter(p => p.severity === 'high').length
  const medium = proposals.filter(p => p.severity === 'medium').length
  const low = proposals.filter(p => p.severity === 'low').length

  return (
    <div>
      {/* Header s "Spustit audit" */}
      <div className="bg-white border border-off2 rounded-xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[14px] font-medium text-text">{proposals.length} čekajících návrhů</h2>
          <p className="text-[12px] text-text2 mt-0.5">
            {high > 0 && <span className="text-red-700">{high} kritické</span>}
            {high > 0 && (medium > 0 || low > 0) && <span className="text-text3"> · </span>}
            {medium > 0 && <span className="text-amber-800">{medium} středně</span>}
            {medium > 0 && low > 0 && <span className="text-text3"> · </span>}
            {low > 0 && <span className="text-text3">{low} nízká</span>}
          </p>
        </div>
        <RunProposalAuditButton />
      </div>

      {proposals.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-10 text-center">
          <div className="text-3xl mb-3">✨</div>
          <h2 className="text-[15px] font-medium text-emerald-900 mb-1">Žádné čekající návrhy</h2>
          <p className="text-[12px] text-emerald-700 max-w-[400px] mx-auto">
            Buď je všechno v pořádku, nebo audit zatím neproběhl. Klikni „Spustit audit teď" výše.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {[...byRule.entries()].map(([ruleId, items]) => {
            const meta = RULE_LABEL[ruleId] ?? { emoji: '🔧', label: ruleId }
            const sev = items[0].severity
            return (
              <details key={ruleId} className={`border rounded-xl overflow-hidden group ${SEVERITY_TONE[sev]}`} open={sev === 'high' || items.length <= 5}>
                <summary className="px-5 py-4 cursor-pointer hover:bg-white/40 list-none flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <div className="text-[15px] font-medium text-text">{meta.label}</div>
                      <div className="text-[11px] text-text3">
                        {items.length} {items.length === 1 ? 'návrh' : items.length < 5 ? 'návrhy' : 'návrhů'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProposalBulkButton ruleId={ruleId} count={items.length} />
                    <span className="text-text3 group-open:rotate-180 transition-transform">▾</span>
                  </div>
                </summary>
                <div className="border-t border-off2 bg-white divide-y divide-off2">
                  {items.map(p => (
                    <ProposalRow
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      reason={p.reason}
                      severity={p.severity}
                      targetSlug={p.target_slug}
                      targetType={p.target_type}
                      action={p.suggested_action}
                    />
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}

      {/* Recent resolved */}
      {recentResolved.length > 0 && (
        <details className="mt-8">
          <summary className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-3 cursor-pointer">
            Nedávno vyřešené ({recentResolved.length}) ▾
          </summary>
          <div className="mt-3 bg-white border border-off2 rounded-xl divide-y divide-off2 overflow-hidden">
            {recentResolved.map(r => (
              <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-[12px]">
                <div className="min-w-0 flex-1">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                    r.status === 'applied' ? 'bg-emerald-500' :
                    r.status === 'failed' ? 'bg-red-500' : 'bg-text3'
                  }`}></span>
                  <span className="text-text">{r.target_label}</span>
                  <span className="text-text3"> — {r.rule_id}</span>
                </div>
                <span className="text-[10px] text-text3">{r.resolution_note}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
