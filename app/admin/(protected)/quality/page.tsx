import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { QualityActions } from './quality-actions'
import { IssueRow } from './issue-row'

export const dynamic = 'force-dynamic'

interface IssueWithProduct {
  id: string
  rule_id: string
  severity: string
  message: string
  status: string
  detected_at: string
  auto_fix_attempted: boolean
  auto_fix_succeeded: boolean | null
  product_id: string
  product_name: string | null
  product_slug: string | null
  rule_name: string | null
  rule_has_auto_fix: boolean
}

async function getIssues(): Promise<IssueWithProduct[]> {
  const { data, error } = await supabaseAdmin
    .from('quality_issues')
    .select(`
      id, rule_id, severity, message, status, detected_at,
      auto_fix_attempted, auto_fix_succeeded, product_id,
      products!inner(name, slug),
      quality_rules!inner(name, has_auto_fix)
    `)
    .order('detected_at', { ascending: false })
    .limit(500)
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw error
  }
  return (data ?? []).map(r => {
    const rec = r as unknown as {
      id: string
      rule_id: string
      severity: string
      message: string
      status: string
      detected_at: string
      auto_fix_attempted: boolean
      auto_fix_succeeded: boolean | null
      product_id: string
      products: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null
      quality_rules: { name?: string; has_auto_fix?: boolean } | { name?: string; has_auto_fix?: boolean }[] | null
    }
    const prod = Array.isArray(rec.products) ? rec.products[0] : rec.products
    const rule = Array.isArray(rec.quality_rules) ? rec.quality_rules[0] : rec.quality_rules
    return {
      id: rec.id,
      rule_id: rec.rule_id,
      severity: rec.severity,
      message: rec.message,
      status: rec.status,
      detected_at: rec.detected_at,
      auto_fix_attempted: rec.auto_fix_attempted,
      auto_fix_succeeded: rec.auto_fix_succeeded,
      product_id: rec.product_id,
      product_name: prod?.name ?? null,
      product_slug: prod?.slug ?? null,
      rule_name: rule?.name ?? null,
      rule_has_auto_fix: rule?.has_auto_fix ?? false,
    }
  })
}

export default async function QualityPage() {
  const issues = await getIssues()
  const open = issues.filter(i => i.status === 'open')
  const errors = open.filter(i => i.severity === 'error')
  const warnings = open.filter(i => i.severity === 'warning')
  const infos = open.filter(i => i.severity === 'info')
  const resolved = issues.filter(i => i.status === 'auto_fixed' || i.status === 'resolved')
  const ignored = issues.filter(i => i.status === 'ignored')

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Discovery</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1">
            Kvalita dat
          </h1>
          <p className="text-[13px] text-text2 max-w-[640px]">
            Quality Audit Agent kontroluje produkty proti pravidlům odvozeným z dosavadních
            chyb. Auto-fix opravuje co lze (re-extract acidity, migrate image, recalc Score),
            zbytek je flagovaný k ručnímu review.
          </p>
        </div>
        <QualityActions />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Otevřené errors" value={errors.length} color="red" />
        <Stat label="Otevřené warnings" value={warnings.length} color="terra" />
        <Stat label="Info" value={infos.length} color="text2" />
        <Stat label="Vyřešené" value={resolved.length} color="olive" />
        <Stat label="Ignorované" value={ignored.length} color="text3" />
      </div>

      {errors.length > 0 && (
        <Section title={`🔴 Chyby (${errors.length})`}>
          <div className="space-y-2">
            {errors.map(i => <IssueRow key={i.id} issue={i} />)}
          </div>
        </Section>
      )}

      {warnings.length > 0 && (
        <Section title={`🟡 Varování (${warnings.length})`}>
          <div className="space-y-2">
            {warnings.map(i => <IssueRow key={i.id} issue={i} />)}
          </div>
        </Section>
      )}

      {infos.length > 0 && (
        <Section title={`🔵 Info (${infos.length})`} subtle>
          <div className="space-y-2">
            {infos.slice(0, 30).map(i => <IssueRow key={i.id} issue={i} />)}
          </div>
        </Section>
      )}

      {resolved.length > 0 && (
        <Section title={`✅ Vyřešené (${resolved.length})`} subtle>
          <details className="bg-white border border-off2 rounded-lg p-4">
            <summary className="cursor-pointer text-sm text-text2">Zobrazit historii</summary>
            <div className="mt-3 space-y-2">
              {resolved.slice(0, 30).map(i => <IssueRow key={i.id} issue={i} />)}
            </div>
          </details>
        </Section>
      )}

      {issues.length === 0 && (
        <div className="bg-white border border-off2 rounded-lg p-8 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-sm text-text2 mb-2">
            Žádné nálezy. Klikni <strong>🔍 Spustit audit</strong> pro kontrolu všech produktů.
          </div>
          <p className="text-xs text-text3">
            Quality Agent prochází každý produkt proti 10 pravidlům (Score, acidity, popis,
            obrázek, certifikace, …) a flagne issues co potřebují tvou akci.
          </p>
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-off2">
        <h2 className="text-base font-semibold text-text mb-3">
          📚 Aktivní pravidla
        </h2>
        <RulesSummary />
      </div>
    </div>
  )
}

async function RulesSummary() {
  const { data: rules } = await supabaseAdmin
    .from('quality_rules')
    .select('*')
    .eq('is_active', true)
    .order('severity', { ascending: true })

  return (
    <div className="grid md:grid-cols-2 gap-2">
      {(rules ?? []).map(r => (
        <div
          key={r.rule_id}
          className="bg-white border border-off2 rounded-lg p-3 flex items-start gap-3"
        >
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0 mt-0.5 ${
              r.severity === 'error'
                ? 'bg-red-100 text-red-700'
                : r.severity === 'warning'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-off text-text2'
            }`}
          >
            {r.severity as string}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-text">
              {r.name as string}
              {r.has_auto_fix && (
                <span className="ml-2 text-[10px] bg-olive-bg text-olive-dark border border-olive-border rounded px-1.5 py-0.5">
                  AUTO-FIX
                </span>
              )}
            </div>
            <div className="text-[11px] text-text3 mt-0.5">{r.description as string}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    red: 'text-red-700',
    terra: 'text-amber-700',
    olive: 'text-olive-dark',
    text: 'text-text',
    text2: 'text-text2',
    text3: 'text-text3',
  }
  return (
    <div className="bg-white border border-off2 rounded-lg p-3">
      <div className={`text-2xl font-semibold ${colorClasses[color] ?? ''}`}>{value}</div>
      <div className="text-[11px] text-text3 mt-0.5">{label}</div>
    </div>
  )
}

function Section({ title, subtle, children }: { title: string; subtle?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className={`text-sm font-semibold mb-3 ${subtle ? 'text-text2' : 'text-text'}`}>
        {title}
      </h2>
      {children}
    </div>
  )
}
