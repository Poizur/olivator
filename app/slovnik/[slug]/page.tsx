import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getActiveTerms, getTermBySlug } from '@/lib/glossary-db'
import { breadcrumbSchema } from '@/lib/schema'

export const revalidate = 3600

export async function generateStaticParams() {
  const terms = await getActiveTerms()
  return terms.map(t => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const term = await getTermBySlug(slug)
  if (!term) return { title: 'Termín nenalezen' }
  return {
    title: term.metaTitle || `${term.term} — slovník olivového oleje`,
    description: term.metaDescription || term.definitionShort,
    alternates: { canonical: `https://olivator.cz/slovnik/${slug}` },
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  general: 'Obecné',
  chemistry: 'Chemie',
  certification: 'Certifikace',
  process: 'Zpracování',
  cultivar: 'Odrůdy',
  region: 'Regiony',
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const term = await getTermBySlug(slug)
  if (!term) notFound()

  const url = `https://olivator.cz/slovnik/${slug}`
  const definedTermSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.term,
    description: term.definitionShort,
    inDefinedTermSet: 'https://olivator.cz/slovnik',
    url,
    termCode: term.slug,
    inLanguage: 'cs-CZ',
  }

  const breadcrumbs = breadcrumbSchema([
    { name: 'Olivátor', url: '/' },
    { name: 'Slovník', url: '/slovnik' },
    { name: term.term, url: `/slovnik/${slug}` },
  ])

  return (
    <article className="max-w-[760px] mx-auto px-6 md:px-10 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <Link href="/slovnik" className="text-olive">Slovník</Link>
        {' › '}
        <span>{term.term}</span>
      </div>

      <div className="inline-block text-[10px] font-semibold tracking-widest uppercase text-olive bg-olive-bg px-3 py-1 rounded-full mb-3">
        {CATEGORY_LABEL[term.category] ?? term.category}
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2 leading-tight">
        {term.term}
      </h1>
      {term.termAlt && (
        <p className="text-[14px] text-text3 italic mb-5">{term.termAlt}</p>
      )}

      <p className="text-[18px] text-text leading-relaxed mb-8 font-medium">
        {term.definitionShort}
      </p>

      {term.definitionLong && (
        <div className="text-[15px] text-text2 leading-relaxed whitespace-pre-line">
          {term.definitionLong}
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-off2">
        <Link href="/slovnik" className="text-[13px] text-olive hover:text-olive-dark">
          ← Zpět na slovník
        </Link>
      </div>
    </article>
  )
}
