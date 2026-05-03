// Admin recipes list — DB-backed s create/edit/delete UI.
// Po Phase 1: recepty jdou z DB tabulky `recipes`, ne ze static contentu.

import Link from 'next/link'
import { getAllRecipes } from '@/lib/recipes-db'
import { CreateRecipeButton } from './create-recipe-button'

export const dynamic = 'force-dynamic'

const CUISINE_LABEL: Record<string, string> = {
  italian: 'italská',
  greek: 'řecká',
  spanish: 'španělská',
  czech: 'česká',
  french: 'francouzská',
  mediterranean: 'středomořská',
}

export default async function AdminRecipesPage() {
  const recipes = await getAllRecipes()

  const active = recipes.filter((r) => r.status === 'active')
  const drafts = recipes.filter((r) => r.status === 'draft')
  const archived = recipes.filter((r) => r.status === 'archived')

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">
            — Obsah
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Recepty</h1>
          <p className="text-[13px] text-text2 mt-1">
            {active.length} aktivních
            {drafts.length > 0 && <> · {drafts.length} draftů</>}
            {archived.length > 0 && <> · {archived.length} archivovaných</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/newsletter/legend"
            className="text-[12px] text-text3 hover:text-olive"
          >
            Jak fungují AI návrhy →
          </Link>
          <CreateRecipeButton />
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-white border border-off2 rounded-xl p-10 text-center">
          <div className="text-3xl mb-3">📝</div>
          <h2 className="text-[16px] font-medium text-text mb-1">Žádné recepty</h2>
          <p className="text-[13px] text-text3 mb-4 max-w-[400px] mx-auto">
            Vytvoř první recept ručně nebo nech ho vygenerovat AI z některé entity
            v <Link href="/admin/regions" className="text-olive">/admin/regions</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => {
            const statusBadge =
              r.status === 'active'
                ? { label: 'aktivní', color: 'bg-olive-bg text-olive-dark border-olive-border' }
                : r.status === 'draft'
                ? { label: 'draft', color: 'bg-amber-50 text-amber-700 border-amber-200' }
                : { label: 'archiv', color: 'bg-off text-text3 border-off2' }

            return (
              <div
                key={r.slug}
                className="bg-white border border-off2 rounded-xl px-5 py-4 hover:border-olive transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl w-12 h-12 bg-olive-bg/40 rounded-lg flex items-center justify-center shrink-0">
                    {r.heroImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={r.heroImageUrl}
                        alt={r.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      r.emoji
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/admin/recipes/${r.slug}`}
                        className="font-medium text-text hover:text-olive line-clamp-1"
                      >
                        {r.title}
                      </Link>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${statusBadge.color}`}
                      >
                        {statusBadge.label}
                      </span>
                      {r.source === 'ai_generated' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                          ✨ AI
                        </span>
                      )}
                      {r.source === 'static_legacy' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-off text-text3 border-off2 whitespace-nowrap">
                          legacy
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-text2 line-clamp-1 mb-1.5">{r.excerpt}</p>
                    <div className="text-[11px] text-text3 flex items-center gap-3 flex-wrap">
                      {r.cuisine && <span>{CUISINE_LABEL[r.cuisine] ?? r.cuisine}</span>}
                      {r.prepTimeMin && <span>· ⏱ {r.prepTimeMin} min</span>}
                      {r.servings && <span>· {r.servings} porcí</span>}
                      {r.recommendedRegions.length > 0 && (
                        <span>· regiony: {r.recommendedRegions.join(', ')}</span>
                      )}
                      {r.recommendedCultivars.length > 0 && (
                        <span>· odrůdy: {r.recommendedCultivars.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Link
                      href={`/admin/recipes/${r.slug}`}
                      className="text-[12px] text-olive font-medium"
                    >
                      Otevřít →
                    </Link>
                    {r.status === 'active' && (
                      <a
                        href={`/recept/${r.slug}`}
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
        <h3 className="text-[13px] font-semibold text-olive-dark mb-2">💡 Jak přidávat recepty</h3>
        <ul className="text-[12px] text-olive-dark/80 space-y-1.5 leading-relaxed">
          <li>
            <strong>Ručně</strong> — klik „+ Nový recept" výše. Otevře se editor s prázdnou
            šablonou, vyplníš ingredience, kroky a tipy.
          </li>
          <li>
            <strong>AI návrh z regionu</strong> — jdi do{' '}
            <Link href="/admin/regions" className="underline">/admin/regions</Link> nebo
            cultivars/brands a klikni „✨ Navrhni recept". AI vytvoří draft který upravíš a
            publikuješ.
          </li>
          <li>
            <strong>Workflow:</strong> draft → uprav → změň status na „active" → recept se
            objeví na <code className="bg-white/50 px-1 rounded">/recept</code> + v newsletteru.
          </li>
        </ul>
      </div>
    </div>
  )
}
