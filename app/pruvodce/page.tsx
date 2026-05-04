import Link from 'next/link'
import { getActiveArticles } from '@/lib/articles-db'
import { getArticles } from '@/lib/static-content'

export const metadata = {
  title: 'Průvodce olivovými oleji',
  description: 'Články, návody a srovnání — vše co potřebujete vědět o olivových olejích.',
}

// 60 → 3600 (1h). Boti crawlovali listing každou minutu = 1440 cache misses/den
// × ~150 KB getProductsWithOffers JSON ≈ 210 MB/den jen z této stránky.
// Průvodce se nemění během dne (admin schvaluje drafty), 1h je bezpečné.
export const revalidate = 3600

const CATEGORY_LABEL: Record<string, string> = {
  pruvodce: 'Průvodce',
  zebricek: 'Žebříček',
  srovnani: 'Srovnání',
  vzdelavani: 'Vzdělávání',
}

export default async function PruvodcePage() {
  // Primárně z DB (po migraci 20260503_articles_db.sql)
  const dbArticles = await getActiveArticles()

  // Fallback: pokud DB prázdná, ukaž static
  const articles =
    dbArticles.length > 0
      ? dbArticles
      : getArticles()
          .filter((a) => a.category !== 'recept')
          .map((a) => ({
            slug: a.slug,
            title: a.title,
            excerpt: a.excerpt,
            emoji: a.emoji,
            readTime: a.readTime,
            heroImageUrl: null,
            category: a.category,
            publishedAt: null,
          }))

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-8 md:py-10">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-1.5">
          Průvodce
        </h1>
        <p className="text-[15px] text-text2 font-light">
          Z olivového světa — články, srovnání, návody. {articles.length}{' '}
          {articles.length === 1 ? 'článek' : articles.length < 5 ? 'články' : 'článků'}.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-10 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-text3 text-[14px]">Články se připravují.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/pruvodce/${a.slug}`}
              className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,.06)] hover:-translate-y-0.5"
            >
              <div className="w-[110px] md:w-[130px] shrink-0 bg-olive-bg/40 flex items-center justify-center text-[40px] md:text-[44px]">
                {a.heroImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={a.heroImageUrl}
                    alt={a.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  a.emoji
                )}
              </div>
              <div className="p-4 flex-1 min-w-0">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-1.5">
                  {CATEGORY_LABEL[a.category] ?? 'Článek'}
                </div>
                <div className="text-[15px] font-medium text-text leading-snug mb-1 tracking-tight line-clamp-2">
                  {a.title}
                </div>
                <div className="text-[11px] text-text3 mb-2">{a.readTime}</div>
                <div className="text-[12px] text-text2 leading-relaxed line-clamp-2">
                  {a.excerpt}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
