import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticleBySlug } from '@/lib/articles-db'
import { ArticleEditForm } from './article-edit-form'

export const dynamic = 'force-dynamic'

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/articles" className="text-olive">Články</Link>
        {' › '}
        {article.title}
      </div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          {article.title}
        </h1>
        <p className="text-[12px] text-text3 mt-1">
          {article.slug} · {article.category} · {article.status}
        </p>
      </div>
      <ArticleEditForm article={article} />
    </div>
  )
}
