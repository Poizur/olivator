import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRankings, getRankingBySlug } from '@/lib/static-content'
import { getProductsBySlugs, getCheapestOffer } from '@/lib/data'
import { ListCard } from '@/components/list-card'
import { breadcrumbSchema } from '@/lib/schema'

export function generateStaticParams() {
  return getRankings().map(r => ({ slug: r.slug }))
}

// 1h cache — žebříčky se mění málo, ale getProductsBySlugs + N× getCheapestOffer
// per page byl volán každý request. 1h cache = N× méně Supabase queries.
export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const ranking = getRankingBySlug(slug)
  if (!ranking) return { title: 'Žebříček nenalezen' }

  // Layout přidá "| Olivator" suffix přes title.template — nepřidávat sami.
  const url = `https://olivator.cz/zebricek/${ranking.slug}`
  const title = ranking.title
  const description = ranking.description ?? `Žebříček: ${ranking.title}. Olivator Score, kyselost, polyfenoly, ceny u prodejců.`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
    },
  }
}

export default async function RankingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ranking = getRankingBySlug(slug)
  if (!ranking) notFound()

  const products = await getProductsBySlugs(ranking.productIds)
  const offers = await Promise.all(products.map(p => getCheapestOffer(p.id)))

  const breadcrumbs = breadcrumbSchema([
    { name: 'Olivátor', url: '/' },
    { name: 'Žebříčky', url: '/zebricek' },
    { name: ranking.title, url: `/zebricek/${ranking.slug}` },
  ])

  // ItemList — žebříček = explicitní ranking. Google může zobrazit jako
  // carousel rich result. Position 1-N = poradí v žebříčku.
  const validOffers = offers.filter((o): o is NonNullable<typeof o> => o != null)
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: ranking.title,
    description: ranking.description,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://olivator.cz/olej/${p.slug}`,
      name: p.name,
    })),
    ...(validOffers.length > 0
      ? {
          aggregateOffer: {
            '@type': 'AggregateOffer',
            priceCurrency: 'CZK',
            lowPrice: Math.min(...validOffers.map((o) => o.price)),
            highPrice: Math.max(...validOffers.map((o) => o.price)),
            offerCount: validOffers.length,
          },
        }
      : {}),
  }

  return (
    <div className="max-w-[1080px] mx-auto px-10 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivator</Link>
        {' › '}
        <Link href="/zebricek" className="text-olive">Žebříčky</Link>
        {' › '}
        {ranking.title}
      </div>

      <div className="mb-8">
        <div className="text-4xl mb-3">{ranking.emoji}</div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-1.5">
          {ranking.title}
        </h1>
        <p className="text-[15px] text-text2 font-light">{ranking.description}</p>
      </div>

      <div className="flex flex-col gap-3">
        {products.map((p, i) => (
          <ListCard
            key={p.id}
            product={p}
            offer={offers[i] ?? undefined}
            rank={i + 1}
          />
        ))}
      </div>
    </div>
  )
}
