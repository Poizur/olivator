import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticles, getArticleBySlug } from '@/lib/static-content'
import { ArticleBody } from '@/components/article-body'

export function generateStaticParams() {
  return getArticles().filter(a => a.category !== 'recept').map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article || article.category === 'recept') notFound()

  // Schema.org Article — pomáhá Google ukázat rich result (excerpt, datum, autor)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    author: {
      '@type': 'Organization',
      name: 'Olivator',
      url: 'https://olivator.cz',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Olivator',
      url: 'https://olivator.cz',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://olivator.cz/pruvodce/${article.slug}`,
    },
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 md:px-10 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivator</Link>
        {' › '}
        <Link href="/pruvodce" className="text-olive">Průvodce</Link>
        {' › '}
        {article.title}
      </div>

      <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-3">
        {CATEGORY_LABEL[article.category as keyof typeof CATEGORY_LABEL] ?? 'Článek'}
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-3 leading-tight">
        {article.title}
      </h1>

      <div className="text-xs text-text3 mb-8">{article.readTime}</div>

      <div className="bg-off rounded-[var(--radius-card)] h-60 flex items-center justify-center text-6xl mb-8">
        {article.emoji}
      </div>

      {article.body ? (
        <ArticleBody body={article.body} />
      ) : (
        <div className="space-y-4 text-text2">
          <p className="text-base leading-relaxed">{article.excerpt}</p>
          <p className="text-base leading-relaxed text-text3 italic">
            Plný obsah článku se připravuje. Vrať se brzy.
          </p>
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-off">
        <Link href="/pruvodce" className="text-sm text-olive">
          ← Zpět na průvodce
        </Link>
      </div>
    </div>
  )
}
