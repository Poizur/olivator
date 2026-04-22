import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRankings, getRankingBySlug } from '@/lib/static-content'
import { getProductsBySlugs, getCheapestOffer } from '@/lib/data'
import { ListCard } from '@/components/list-card'

export function generateStaticParams() {
  return getRankings().map(r => ({ slug: r.slug }))
}

export default async function RankingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ranking = getRankingBySlug(slug)
  if (!ranking) notFound()

  const products = await getProductsBySlugs(ranking.productIds)
  const offers = await Promise.all(products.map(p => getCheapestOffer(p.id)))

  return (
    <div className="max-w-[1080px] mx-auto px-10 py-10">
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
