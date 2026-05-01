import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { ARTICLES } from '@/lib/static-content'

async function getEntityLinkCounts(): Promise<Record<string, number>> {
  const recipeSlugs = ARTICLES.filter((a) => a.category === 'recept').map((a) => a.slug)
  const { data } = await supabaseAdmin
    .from('recipe_entity_links')
    .select('recipe_slug')
    .in('recipe_slug', recipeSlugs)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.recipe_slug] = (counts[row.recipe_slug] ?? 0) + 1
  }
  return counts
}

export default async function AdminRecipesPage() {
  const recipes = ARTICLES.filter((a) => a.category === 'recept')
  const linkCounts = await getEntityLinkCounts()

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Katalog</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Recepty</h1>
          <p className="text-[13px] text-text2 mt-1">{recipes.length} receptů v katalogu</p>
        </div>
        <div className="text-xs text-text3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-xs">
          Obsah receptů je spravován v <code className="font-mono">lib/static-content.ts</code>. Propojení s entitami (region/značka/odrůda) se nastavuje na stránce entity.
        </div>
      </div>

      <div className="bg-white border border-off2 rounded-xl divide-y divide-off2">
        {recipes.map((r) => {
          const links = linkCounts[r.slug] ?? 0
          return (
            <div key={r.slug} className="flex items-center gap-4 px-5 py-4">
              <div className="text-2xl w-8 shrink-0">{r.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-medium text-text">{r.title}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-olive-bg text-olive-dark font-medium shrink-0">
                    recept
                  </span>
                </div>
                <div className="text-xs text-text3 leading-snug">
                  {r.excerpt}
                </div>
                <div className="text-[11px] text-text3 mt-1 flex items-center gap-3">
                  <span>{r.readTime}</span>
                  <span>·</span>
                  <span>
                    {links > 0 ? (
                      <span className="text-olive">{links} {links === 1 ? 'propojená entita' : links < 5 ? 'propojené entity' : 'propojených entit'}</span>
                    ) : (
                      <span className="text-text3">nepropojeno s žádnou entitou</span>
                    )}
                  </span>
                  <span>·</span>
                  <span className="font-mono">{r.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/recept/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-olive hover:underline"
                >
                  Náhled →
                </a>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 border border-dashed border-off2 rounded-xl p-6 text-center">
        <p className="text-sm font-medium text-text2 mb-1">Přidat nový recept</p>
        <p className="text-xs text-text3 mb-3">
          Recepty se přidávají přímo do kódu — otevři{' '}
          <code className="font-mono bg-off px-1 py-0.5 rounded">lib/static-content.ts</code>{' '}
          a přidej záznam do pole <code className="font-mono bg-off px-1 py-0.5 rounded">ARTICLES</code>{' '}
          s <code className="font-mono bg-off px-1 py-0.5 rounded">category: &apos;recept&apos;</code>.
          Obsah receptu jde do{' '}
          <code className="font-mono bg-off px-1 py-0.5 rounded">lib/article-bodies.ts</code>.
        </p>
        <p className="text-xs text-text3">
          Propojení receptu s regiony, značkami nebo odrůdami nastavíš na stránce dané entity v adminu.
        </p>
      </div>
    </div>
  )
}
