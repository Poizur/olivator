// Admin articles list — DB-backed s create/edit/delete UI.

import Link from 'next/link'
import { getAllArticles } from '@/lib/articles-db'
import { CreateArticleButton } from './create-article-button'

export const dynamic = 'force-dynamic'

const CATEGORY_LABEL: Record<string, string> = {
  pruvodce: 'Průvodce',
  zebricek: 'Žebříček',
  srovnani: 'Srovnání',
  vzdelavani: 'Vzdělávání',
}

export default async function AdminArticlesPage() {
  const articles = await getAllArticles()
  const active = articles.filter((a) => a.status === 'active')
  const drafts = articles.filter((a) => a.status === 'draft')
  const archived = articles.filter((a) => a.status === 'archived')

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Obsah</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Články</h1>
          <p className="text-[13px] text-text2 mt-1">
            {active.length} aktivních
            {drafts.length > 0 && <> · {drafts.length} draftů</>}
            {archived.length > 0 && <> · {archived.length} archivovaných</>}
          </p>
        </div>
        <CreateArticleButton />
      </div>

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
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${status.color}`}
                      >
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
                    <Link
                      href={`/admin/articles/${a.slug}`}
                      className="text-[12px] text-olive font-medium"
                    >
                      Otevřít →
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
    </div>
  )
}
