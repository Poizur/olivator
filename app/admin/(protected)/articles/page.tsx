// Admin articles — sloučená stránka: Publikované články + AI Article Drafty.
// Tab=drafts: záznamy z article_drafts (AI-generované, čekají na schválení).
// Tab=published (výchozí): záznamy z articles tabulky.

import Link from 'next/link'
import { getAllArticles } from '@/lib/articles-db'
import { supabaseAdmin } from '@/lib/supabase'
import { CreateArticleButton } from './create-article-button'
import { BulkPublishButton } from '@/components/admin/bulk-publish-button'

export const dynamic = 'force-dynamic'

const CATEGORY_LABEL: Record<string, string> = {
  pruvodce: 'Průvodce',
  zebricek: 'Žebříček',
  srovnani: 'Srovnání',
  vzdelavani: 'Vzdělávání',
}

const DRAFT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
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

async function getAiDrafts(): Promise<DraftRow[]> {
  const { data } = await supabaseAdmin
    .from('article_drafts')
    .select('id, title, slug, word_count, reviewer_severity, reviewer_notes, status, admin_note, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as DraftRow[]
}

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const isDraftsTab = searchParams.tab === 'drafts'

  const [articles, aiDrafts] = await Promise.all([
    getAllArticles(),
    getAiDrafts(),
  ])

  const active = articles.filter((a) => a.status === 'active')
  const articleDrafts = articles.filter((a) => a.status === 'draft')
  const archived = articles.filter((a) => a.status === 'archived')
  const aiPending = aiDrafts.filter((d) => d.status === 'draft')

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Obsah</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Články</h1>
        </div>
        {!isDraftsTab && (
          <div className="flex items-center gap-2 flex-wrap">
            <BulkPublishButton
              endpoint="/api/admin/articles/bulk-publish"
              draftCount={articleDrafts.filter((d) => d.bodyMarkdown && d.bodyMarkdown.trim().length > 0).length}
              entityLabel="průvodců"
            />
            <CreateArticleButton />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border border-off2 rounded-lg overflow-hidden mb-6 w-fit">
        <Link
          href="/admin/articles"
          className={`px-4 py-2 text-[13px] transition-colors ${
            !isDraftsTab
              ? 'bg-olive-bg text-olive-dark font-medium'
              : 'text-text2 hover:bg-off'
          }`}
        >
          Publikované
          <span className="ml-1.5 text-[11px] text-text3">
            {active.length} aktivních{articleDrafts.length > 0 ? ` · ${articleDrafts.length} draftů` : ''}
          </span>
        </Link>
        <Link
          href="/admin/articles?tab=drafts"
          className={`px-4 py-2 text-[13px] border-l border-off2 transition-colors flex items-center gap-1.5 ${
            isDraftsTab
              ? 'bg-olive-bg text-olive-dark font-medium'
              : 'text-text2 hover:bg-off'
          }`}
        >
          AI Drafty
          {aiPending.length > 0 && (
            <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-md px-1.5 py-0.5 tabular-nums">
              {aiPending.length}
            </span>
          )}
        </Link>
      </div>

      {/* ── Tab: AI Drafty ── */}
      {isDraftsTab && (
        <>
          <p className="text-[13px] text-text2 mb-4">
            {aiPending.length} čeká na review
            {aiDrafts.filter((d) => d.status === 'approved').length > 0 && (
              <> · {aiDrafts.filter((d) => d.status === 'approved').length} schváleno</>
            )}
            {aiDrafts.filter((d) => d.status === 'published').length > 0 && (
              <> · {aiDrafts.filter((d) => d.status === 'published').length} publikováno</>
            )}
          </p>

          {aiDrafts.length === 0 ? (
            <div className="bg-white border border-off2 rounded-xl p-10 text-center">
              <div className="text-3xl mb-3">📝</div>
              <h2 className="text-[16px] font-medium text-text mb-1">Žádné AI drafty</h2>
              <p className="text-[13px] text-text3 max-w-[400px] mx-auto">
                Drafty se tvoří spuštěním Article Publisheru (Krok 5 — Opportunity Finder + Draft Generator).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {aiDrafts.map((d) => {
                const status = DRAFT_STATUS_LABELS[d.status] ?? { label: d.status, color: 'bg-off text-text2 border-off2' }
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
                      <div className="shrink-0 text-right">
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
            Po schválení: vykopíruj body_markdown na záložku{' '}
            <Link href="/admin/articles" className="underline">Publikované</Link> → vytvoř nový článek se slugem.
          </div>
        </>
      )}

      {/* ── Tab: Publikované ── */}
      {!isDraftsTab && (
        <>
          {articles.length === 0 ? (
            <div className="bg-white border border-off2 rounded-xl p-10 text-center">
              <div className="text-3xl mb-3">📝</div>
              <h2 className="text-[16px] font-medium text-text mb-1">Zatím žádné průvodce</h2>
              <p className="text-[13px] text-text3 mb-4 max-w-[400px] mx-auto">
                Klikni nahoře vpravo na <strong>+ Nový průvodce</strong> a začni psát.
                Téma vyber podle plánu v CLAUDE.md sekci 17.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((a) => {
                const status =
                  a.status === 'active'
                    ? { label: 'aktivní', color: 'bg-olive-bg text-olive-dark border-olive-border' }
                    : a.status === 'draft'
                    ? { label: 'draft', color: 'bg-amber-50 text-amber-700 border-amber-200' }
                    : { label: 'archiv', color: 'bg-off text-text3 border-off2' }
                return (
                  <div
                    key={a.slug}
                    className="bg-white border border-off2 rounded-xl px-5 py-4 hover:border-olive transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl w-12 h-12 bg-olive-bg/40 rounded-lg flex items-center justify-center shrink-0">
                        {a.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Link
                            href={`/admin/articles/${a.slug}`}
                            className="font-medium text-text hover:text-olive line-clamp-1"
                          >
                            {a.title}
                          </Link>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-off text-text3 border-off2 whitespace-nowrap">
                            {CATEGORY_LABEL[a.category] ?? a.category}
                          </span>
                        </div>
                        <p className="text-[13px] text-text2 line-clamp-1 mb-1.5">{a.excerpt}</p>
                        <div className="text-[11px] text-text3 flex items-center gap-3 flex-wrap">
                          {a.readTime && <span>{a.readTime}</span>}
                          <span>· {a.bodyMarkdown?.length ?? 0} znaků</span>
                          <span>· {a.slug}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Link href={`/admin/articles/${a.slug}`} className="text-[12px] text-olive font-medium">
                          Upravit →
                        </Link>
                        {a.status === 'active' && (
                          <a
                            href={`/pruvodce/${a.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-text3 hover:text-olive"
                          >
                            Náhled ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-8 bg-olive-bg/30 border border-olive-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-olive-dark mb-2">💡 Template tokens v textu</h3>
            <p className="text-[12px] text-olive-dark/80 leading-relaxed mb-2">
              Místo natvrdo psaných čísel piš tokeny — resolvují se live při každém načtení stránky:
            </p>
            <ul className="text-[12px] text-olive-dark/80 space-y-1 leading-relaxed font-mono">
              <li><code>{'{{products.count}}'}</code> → {`60`} (aktuální počet aktivních olejů)</li>
              <li><code>{'{{retailers.activeCount}}'}</code> → {`15`}</li>
              <li><code>{'{{regions.count}}'}</code> · <code>{'{{cultivars.count}}'}</code> · <code>{'{{brands.count}}'}</code></li>
              <li><code>{'{{date.year}}'}</code> → 2026</li>
              <li><code>{'{{link:srovnavac|srovnávač}}'}</code> → klikatelný odkaz</li>
              <li><code>{'{{link:oblast/apulie|Apulie}}'}</code> → odkaz na region</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
