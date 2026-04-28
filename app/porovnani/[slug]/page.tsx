import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductsBySlugs, getProductsWithOffers } from '@/lib/data'
import { ComparatorContent } from '../comparator-content'

interface RouteParams {
  slug: string
}

const SEPARATOR = '-vs-'

/** Parse "evolia-platinum-vs-sitia-5l-vs-intini-coratina" → array slugů.
 *  Vrací pole slugů v pořadí jak je v URL. */
function parseComparisonSlug(slug: string): string[] {
  return slug
    .split(SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const { slug } = await params
  const slugs = parseComparisonSlug(slug)
  const items = await getProductsBySlugs(slugs)

  if (items.length < 2) {
    return {
      title: 'Porovnání olejů',
      description: 'Porovnání olivových olejů — Score, kyselost, polyfenoly, cena.',
    }
  }

  const names = items.map((p) => p.nameShort).join(' vs ')
  const winner = [...items].sort((a, b) => b.olivatorScore - a.olivatorScore)[0]
  const desc = `Porovnání ${items.length} olivových olejů: ${items
    .map((p) => p.nameShort)
    .join(', ')}. Nejlepší: ${winner.nameShort} (Score ${winner.olivatorScore}).`

  const canonicalUrl = `https://olivator.cz/porovnani/${slug}`

  return {
    title: `${names} — porovnání`,
    description: desc.slice(0, 160),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      locale: 'cs_CZ',
      url: canonicalUrl,
      siteName: 'Olivator',
      title: `${names} — porovnání`,
      description: desc.slice(0, 160),
    },
  }
}

export default async function SlugComparatorPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const { slug } = await params
  const slugs = parseComparisonSlug(slug)
  if (slugs.length < 2) notFound()

  const allProducts = await getProductsWithOffers()
  const bySlug = new Map(allProducts.map((p) => [p.slug, p]))
  const serverItems = slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is (typeof allProducts)[number] => !!p)

  if (serverItems.length < 2) notFound()

  return (
    <Suspense fallback={<div className="p-10 text-center text-text3">Načítání...</div>}>
      <ComparatorContent allProducts={allProducts} serverItems={serverItems} />
    </Suspense>
  )
}
