import Link from 'next/link'
import { getActiveRecipes } from '@/lib/recipes-db'
import { getArticles } from '@/lib/static-content'

export const metadata = {
  title: 'Recepty s olivovým olejem',
  description: 'Recepty kde kvalita olivového oleje dělá rozdíl. S doporučením konkrétního oleje.',
}

// 60 → 3600 (1h). Recepty se nemění minutu po minutě, 1h cache je bezpečné.
// Když admin uloží draft, manuální revalidate cestou /api/admin/revalidate.
export const revalidate = 3600

const CUISINE_LABEL: Record<string, string> = {
  italian: 'italská',
  greek: 'řecká',
  spanish: 'španělská',
  czech: 'česká',
  french: 'francouzská',
  mediterranean: 'středomořská',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'snadné',
  medium: 'střední',
  hard: 'náročnější',
}

export default async function ReceptyPage() {
  // Primárně z DB. Pokud DB prázdná (před migrací), fallback na static.
  const dbRecipes = await getActiveRecipes()

  const recipes = dbRecipes.length > 0
    ? dbRecipes
    : getArticles()
        .filter((a) => a.category === 'recept')
        .map((a) => ({
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          emoji: a.emoji,
          readTime: a.readTime,
          heroImageUrl: null,
          prepTimeMin: null,
          servings: null,
          difficulty: null,
          cuisine: null,
          recommendedRegions: [] as string[],
          recommendedCultivars: [] as string[],
          publishedAt: null,
        }))

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-8 md:py-10">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-1.5">
          Recepty
        </h1>
        <p className="text-[15px] text-text2 font-light">
          Recepty kde kvalita olivového oleje dělá rozdíl. {recipes.length}{' '}
          {recipes.length === 1 ? 'recept' : recipes.length < 5 ? 'recepty' : 'receptů'}.
        </p>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-10 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-text3 text-[14px]">Recepty se připravují.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {recipes.map((r) => (
            <Link
              key={r.slug}
              href={`/recept/${r.slug}`}
              className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,.06)] hover:-translate-y-0.5"
            >
              <div className="w-[110px] md:w-[130px] shrink-0 bg-olive-bg/40 flex items-center justify-center text-[40px] md:text-[44px]">
                {r.heroImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={r.heroImageUrl}
                    alt={r.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  r.emoji
                )}
              </div>
              <div className="p-4 flex-1 min-w-0">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-1.5">
                  Recept
                  {r.cuisine && (
                    <>
                      <span className="mx-1.5 text-text3">·</span>
                      <span className="text-text3">{CUISINE_LABEL[r.cuisine] ?? r.cuisine}</span>
                    </>
                  )}
                </div>
                <div className="text-[15px] font-medium text-text leading-snug mb-1 tracking-tight">
                  {r.title}
                </div>
                <div className="text-[11px] text-text3 mb-2 flex items-center gap-2 flex-wrap">
                  {r.prepTimeMin && <span>⏱ {r.prepTimeMin} min</span>}
                  {r.servings && <span>· {r.servings} porcí</span>}
                  {r.difficulty && (
                    <span>· {DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty}</span>
                  )}
                  {!r.prepTimeMin && r.readTime && <span>{r.readTime}</span>}
                </div>
                <div className="text-xs text-text2 leading-relaxed line-clamp-2">{r.excerpt}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
