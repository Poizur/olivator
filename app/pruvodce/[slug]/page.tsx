import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticles, getArticleBySlug } from '@/lib/static-content'
import { ArticleBody } from '@/components/article-body'
import { resolveTemplateVars } from '@/lib/template-vars'
import { getProductsWithOffers } from '@/lib/data'
import { formatPrice } from '@/lib/utils'

export const revalidate = 60

export function generateStaticParams() {
  return getArticles().filter((a) => a.category !== 'recept').map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Článek nenalezen' }
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `https://olivator.cz/pruvodce/${article.slug}` },
    openGraph: {
      type: 'article',
      url: `https://olivator.cz/pruvodce/${article.slug}`,
      title: article.title,
      description: article.excerpt,
    },
  }
}

const CATEGORY_LABEL = {
  pruvodce: 'Průvodce',
  zebricek: 'Žebříček',
  srovnani: 'Srovnání',
  vzdelavani: 'Vzdělávání',
} as const

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article || article.category === 'recept') notFound()

  // Resolve template variables ({{products.count}}, {{link:srovnavac|srovnávač}})
  const resolvedBody = article.body ? await resolveTemplateVars(article.body, 'markdown') : ''

  // Sidebar data — top oleje + related články + recepty
  const allProducts = await getProductsWithOffers()
  const topProducts = allProducts
    .filter((p) => p.olivatorScore != null)
    .sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))
    .slice(0, 5)

  const otherArticles = getArticles()
    .filter((a) => a.category !== 'recept' && a.slug !== article.slug)
    .slice(0, 3)

  const recipeArticles = getArticles().filter((a) => a.category === 'recept').slice(0, 2)

  // Schema.org Article
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    author: { '@type': 'Organization', name: 'Olivátor', url: 'https://olivator.cz' },
    publisher: { '@type': 'Organization', name: 'Olivátor', url: 'https://olivator.cz' },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://olivator.cz/pruvodce/${article.slug}`,
    },
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-8 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <Link href="/pruvodce" className="text-olive">Průvodce</Link>
        {' › '}
        {article.title}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12 items-start">
        {/* Main article column */}
        <article className="min-w-0 max-w-[720px]">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-3">
            {CATEGORY_LABEL[article.category as keyof typeof CATEGORY_LABEL] ?? 'Článek'}
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-3 leading-tight">
            {article.title}
          </h1>

          <p className="text-[15px] text-text2 leading-relaxed mb-5">{article.excerpt}</p>

          <div className="text-xs text-text3 mb-8 flex items-center gap-2">
            <span>{article.readTime}</span>
          </div>

          <div className="bg-olive-bg/40 rounded-[var(--radius-card)] aspect-[16/9] flex items-center justify-center text-6xl md:text-7xl mb-8">
            {article.emoji}
          </div>

          {resolvedBody ? (
            <ArticleBody body={resolvedBody} />
          ) : (
            <div className="space-y-4 text-text2">
              <p className="text-base leading-relaxed">{article.excerpt}</p>
              <p className="text-base leading-relaxed text-text3 italic">
                Plný obsah článku se připravuje.
              </p>
            </div>
          )}

          {/* Inline CTA — důvěryhodnost */}
          <div className="bg-off/60 border border-off2 rounded-[var(--radius-card)] p-5 mt-10">
            <p className="text-[13px] text-text2 leading-relaxed">
              <strong className="text-text">Olivátor</strong> je největší srovnávač olivových
              olejů v ČR. Sledujeme reálné ceny u 18 prodejců a hodnotíme oleje podle
              objektivního Olivator Score.{' '}
              <Link href="/metodika" className="text-olive border-b border-olive-border">
                Jak hodnotíme →
              </Link>
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-off">
            <Link href="/pruvodce" className="text-sm text-olive">
              ← Zpět na průvodce
            </Link>
          </div>
        </article>

        {/* Sidebar — sticky na desktopu, scrolluje s článkem */}
        <aside className="lg:sticky lg:top-[140px] space-y-5">
          {/* Top oleje */}
          {topProducts.length > 0 && (
            <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-3">
                🏆 Top oleje
              </div>
              <ul className="space-y-2.5">
                {topProducts.map((p, i) => (
                  <li key={p.id}>
                    <Link
                      href={`/olej/${p.slug}`}
                      className="flex items-start gap-2.5 group"
                    >
                      <span className="shrink-0 w-5 text-[12px] text-text3 font-mono tabular-nums">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-text font-medium leading-tight line-clamp-1 group-hover:text-olive">
                          {p.nameShort || p.name}
                        </div>
                        <div className="text-[11px] text-text3 mt-0.5 flex items-center gap-2">
                          <span className="text-terra font-semibold">{p.olivatorScore}</span>
                          {p.cheapestOffer && (
                            <span>· {formatPrice(p.cheapestOffer.price)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/srovnavac"
                className="block text-center text-[12px] text-olive font-medium mt-3 pt-3 border-t border-off2 hover:text-olive-dark"
              >
                Srovnat všechny oleje →
              </Link>
            </div>
          )}

          {/* Related guides */}
          {otherArticles.length > 0 && (
            <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-3">
                📚 Další průvodci
              </div>
              <ul className="space-y-2.5">
                {otherArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/pruvodce/${a.slug}`}
                      className="flex items-start gap-2.5 group"
                    >
                      <span className="text-base shrink-0">{a.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-text font-medium leading-tight line-clamp-2 group-hover:text-olive">
                          {a.title}
                        </div>
                        <div className="text-[11px] text-text3 mt-0.5">{a.readTime}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recepty */}
          {recipeArticles.length > 0 && (
            <div className="bg-olive-bg/40 border border-olive-border/60 rounded-[var(--radius-card)] p-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive-dark mb-3">
                🍅 Recepty s olejem
              </div>
              <ul className="space-y-2.5">
                {recipeArticles.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/recept/${r.slug}`}
                      className="flex items-start gap-2.5 group"
                    >
                      <span className="text-base shrink-0">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-olive-dark font-medium leading-tight line-clamp-2 group-hover:text-olive">
                          {r.title}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/recept"
                className="block text-center text-[12px] text-olive-dark font-medium mt-3 pt-3 border-t border-olive-border/40"
              >
                Všechny recepty →
              </Link>
            </div>
          )}

          {/* Trust signal */}
          <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-2">
              💡 Jak hodnotíme
            </div>
            <p className="text-[12px] text-text2 leading-relaxed mb-3">
              Olivator Score (0-100) kombinuje kyselost, polyfenoly, certifikace a poměr
              cena/kvalita. Žádné placené pozice, žádné dotazníky producentů.
            </p>
            <Link
              href="/metodika"
              className="text-[12px] text-olive font-medium hover:text-olive-dark"
            >
              Plná metodika →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
