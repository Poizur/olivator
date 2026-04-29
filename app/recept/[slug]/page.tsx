import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticles, getArticleBySlug } from '@/lib/static-content'
import { getProductsWithOffers } from '@/lib/data'
import { formatPrice } from '@/lib/utils'
import { ArticleBody } from '@/components/article-body'

export function generateStaticParams() {
  return getArticles().filter(a => a.category === 'recept').map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Recept nenalezen' }
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `https://olivator.cz/recept/${article.slug}` },
    openGraph: {
      type: 'article',
      url: `https://olivator.cz/recept/${article.slug}`,
      title: article.title,
      description: article.excerpt,
    },
  }
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article || article.category !== 'recept') notFound()

  const allProducts = await getProductsWithOffers()
  const recommended = allProducts.slice(0, 2)

  // Schema.org Recipe — strukturované recept-rich-snippet (může vyhrát ingredients carousel)
  const recipeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: article.title,
    description: article.excerpt,
    author: { '@type': 'Organization', name: 'Olivator' },
    publisher: {
      '@type': 'Organization',
      name: 'Olivator',
      url: 'https://olivator.cz',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://olivator.cz/recept/${article.slug}`,
    },
    recipeCategory: 'Italian',
    recipeCuisine: 'Mediterranean',
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 md:px-10 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchema) }}
      />
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivator</Link>
        {' › '}
        <Link href="/recept" className="text-olive">Recepty</Link>
        {' › '}
        {article.title}
      </div>

      <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-3">
        Recept
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-3 leading-tight">
        {article.title}
      </h1>

      <div className="text-xs text-text3 mb-8">{article.readTime}</div>

      <div className="bg-off rounded-[var(--radius-card)] h-60 flex items-center justify-center text-6xl mb-8">
        {article.emoji}
      </div>

      <div className="mb-8">
        {article.body ? (
          <ArticleBody body={article.body} />
        ) : (
          <div className="space-y-4 text-text2">
            <p className="text-base leading-relaxed">{article.excerpt}</p>
            <p className="text-base leading-relaxed text-text3 italic">
              Plný recept se připravuje. Vrať se brzy.
            </p>
          </div>
        )}
      </div>

      {/* Affiliate CTA */}
      <div className="bg-olive-bg rounded-[var(--radius-card)] p-5 mb-8">
        <div className="text-[11px] font-semibold tracking-widest uppercase text-olive mb-3">
          Doporučené oleje pro tento recept
        </div>
        {recommended.map(p => {
          const offer = p.cheapestOffer
          return (
            <Link
              key={p.id}
              href={`/olej/${p.slug}`}
              className="flex items-center justify-between py-3 border-b border-olive-border last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-olive-bg rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-base italic text-olive leading-none">
                  {p.name.charAt(0)}
                </span>
                <div>
                  <div className="text-sm font-medium text-text">{p.name}</div>
                  <div className="text-xs text-text2">Score {p.olivatorScore}</div>
                </div>
              </div>
              {offer && (
                <div className="text-sm font-semibold text-olive">
                  {formatPrice(offer.price)} u {offer.retailer.name}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      <div className="pt-6 border-t border-off">
        <Link href="/recept" className="text-sm text-olive">
          ← Zpět na recepty
        </Link>
      </div>
    </div>
  )
}
