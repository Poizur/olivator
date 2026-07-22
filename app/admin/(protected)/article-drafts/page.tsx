// AI Article Drafts — správa článků vygenerovaných Article Publisherem.
// Zobrazuje záznamy z article_drafts (ne z articles tabulky).
// Workflow: draft → Architekt schválí → publikuje manuálně do articles.

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface DraftRow {
  id: string
  title: string
  slug: string | null
  word_count: number | null
  reviewer_severity: string | null
  reviewer_notes: { severity?: string; issues?: string; verdict?: string } | null
  status: string
  admin_note: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Schváleno', color: 'bg-olive-bg text-olive-dark border-olive-border' },
  rejected: { label: 'Zamítnuto', color: 'bg-red-50 text-red-700 border-red-200' },
  published: { label: 'Publikováno', color: 'bg-off text-text2 border-off2' },
}

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  ok: { label: '✓ OK', color: 'text-olive-dark' },
  warn: { label: '⚠ Warn', color: 'text-amber-600' },
  block: { label: '✗ Block', color: 'text-red-600' },
}

async function getDrafts(): Promise<DraftRow[]> {
  const { data } = await supabaseAdmin
    .from('article_drafts')
    .select('id, title, slug, word_count, reviewer_severity, reviewer_notes, status, admin_note, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as DraftRow[]
}

export default async function ArticleDraftsPage() {
  const drafts = await getDrafts()
  const pending = drafts.filter((d) => d.status === 'draft')
  const approved = drafts.filter((d) => d.status === 'approved')
  const published = drafts.filter((d) => d.status === 'published')

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Obsah</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">AI Article Drafty</h1>
          <p className="text-[13px] text-text2 mt-1">
            {pending.length} čeká na review
            {approved.length > 0 && <> · {approved.length} schváleno</>}
            {published.length > 0 && <> · {published.length} publikováno</>}
          </p>
        </div>
        <Link
          href="/admin/articles"
          className="text-[12px] text-text2 hover:text-olive border border-off2 rounded-full px-3 py-1.5"
        >
          Publikované články →
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="bg-white border border-off2 rounded-xl p-10 text-center">
          <div className="text-3xl mb-3">📝</div>
          <h2 className="text-[16px] font-medium text-text mb-1">Žádné AI drafty</h2>
          <p className="text-[13px] text-text3 max-w-[400px] mx-auto">
            Drafty se tvoří spuštěním Article Publisheru (Krok 5 — Opportunity Finder + Draft Generator).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((d) => {
            const status = STATUS_LABELS[d.status] ?? { label: d.status, color: 'bg-off text-text2 border-off2' }
            const severity = d.reviewer_severity ? (SEVERITY_LABELS[d.reviewer_severity] ?? null) : null
            return (
              <div
                key={d.id}
                className="bg-white border border-off2 rounded-xl px-5 py-4 hover:border-olive/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-medium text-text line-clamp-1">{d.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${status.color}`}>
                        {status.label}
                      </span>
                      {severity && (
                        <span className={`text-[11px] font-medium whitespace-nowrap ${severity.color}`}>
                          {severity.label}
                        </span>
                      )}
                    </div>
                    {d.slug && (
                      <div className="text-[11px] text-text3 mb-1 font-mono">/pruvodce/{d.slug}</div>
                    )}
                    {d.reviewer_notes?.verdict && (
                      <p className="text-[12px] text-text2 line-clamp-2 mb-2">{d.reviewer_notes.verdict}</p>
                    )}
                    {d.reviewer_notes?.issues && d.reviewer_notes.issues !== 'Žádné' && d.reviewer_notes.issues !== 'Zadne' && (
                      <details className="text-[11px] text-text3 mb-2">
                        <summary className="cursor-pointer hover:text-text2 select-none">Reviewer issues</summary>
                        <div className="mt-1 whitespace-pre-wrap pl-2 border-l border-off2">{d.reviewer_notes.issues}</div>
                      </details>
                    )}
                    {d.admin_note && (
                      <p className="text-[11px] text-text3 italic">{d.admin_note}</p>
                    )}
                    <div className="text-[11px] text-text3 mt-1.5 flex gap-3">
                      {d.word_count && <span>{d.word_count} slov</span>}
                      <span>·</span>
                      <span>{new Date(d.created_at).toLocaleString('cs-CZ', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                    <span className="text-[11px] text-text3 font-mono">{d.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 bg-olive-bg/30 border border-olive-border rounded-xl p-5 text-[12px] text-olive-dark/80 leading-relaxed">
        <strong className="text-olive-dark">Workflow:</strong> Reviewer vrátí{' '}
        <code className="font-mono bg-white/60 px-1 rounded">ok</code> nebo{' '}
        <code className="font-mono bg-white/60 px-1 rounded">warn</code> (publikovatelné) nebo{' '}
        <code className="font-mono bg-white/60 px-1 rounded">block</code> (vyžaduje editaci).
        Po schválení Architektem: vykopíruj body_markdown do <Link href="/admin/articles" className="underline">Článků</Link> →
        vytvoř nový článek se slugem a publikuj.
      </div>
    </div>
  )
}
