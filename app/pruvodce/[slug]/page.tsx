import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticles, getArticleBySlug } from '@/lib/static-content'

export function generateStaticParams() {
  return getArticles().filter(a => a.category !== 'recept').map(a => ({ slug: a.slug }))
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article || article.category === 'recept') notFound()

  return (
    <div className="max-w-[720px] mx-auto px-10 py-10">
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivator</Link>
        {' › '}
        <Link href="/pruvodce" className="text-olive">Průvodce</Link>
        {' › '}
        {article.title}
      </div>

      <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-3">
        {article.category === 'pruvodce' ? 'Průvodce' : article.category === 'zebricek' ? 'Žebříček' : article.category === 'srovnani' ? 'Srovnání' : 'Vzdělávání'}
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-3 leading-tight">
        {article.title}
      </h1>

      <div className="text-xs text-text3 mb-8">{article.readTime}</div>

      <div className="bg-off rounded-[var(--radius-card)] h-60 flex items-center justify-center text-6xl mb-8">
        {article.emoji}
      </div>

      <div className="prose prose-lg text-text2 leading-relaxed">
        <p className="text-base leading-relaxed">{article.excerpt}</p>
        <p className="text-base leading-relaxed mt-4 text-text3 italic">
          Plný obsah tohoto článku bude vygenerován Content Agentem po připojení Supabase a Claude API.
        </p>
      </div>

      <div className="mt-10 pt-6 border-t border-off">
        <Link href="/pruvodce" className="text-sm text-olive">
          ← Zpět na průvodce
        </Link>
      </div>
    </div>
  )
}
