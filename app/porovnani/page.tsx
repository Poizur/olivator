import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getProductsWithOffers } from '@/lib/data'
import { ComparatorContent } from './comparator-content'

// 1h cache — každý bot request /porovnani s libovolným ?ids= dnes fetchoval
// celý katalog (getProductsWithOffers volán 2× v page). Pro různé combinace
// ?ids= boti generují nové cache entries, ale aspoň ne dvojitý egress.
export const revalidate = 3600

interface SearchParams {
  ids?: string
}

/** Read product IDs from query string (?ids=A,B,C). Comma-separated UUIDs. */
function parseIds(searchParams: SearchParams | undefined): string[] {
  if (!searchParams?.ids) return []
  return searchParams.ids.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const ids = parseIds(params)

  if (ids.length === 0) {
    return {
      title: 'Pomůžeme ti vybrat olivový olej',
      description:
        'Postav 2–5 olejů vedle sebe a uvidíš rozdíly v Score, kyselosti, polyfenolech a ceně. Bez marketingu, jen fakta.',
    }
  }

  // Fetch products to build a specific title/description for THIS comparison
  const all = await getProductsWithOffers()
  const items = ids
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)

  if (items.length < 2) {
    return {
      title: 'Pomůžeme ti vybrat olivový olej',
      description: 'Postav 2–5 olejů vedle sebe a uvidíš rozdíly.',
    }
  }

  const names = items.map((p) => p.nameShort).join(' vs ')
  const winner = [...items].sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))[0]
  const winnerScore = winner.type !== 'flavored' && winner.olivatorScore != null && winner.olivatorScore > 0
    ? ` (Score ${winner.olivatorScore})` : ''
  const desc = `Porovnání ${items.length} olivových olejů: ${items
    .map((p) => p.nameShort)
    .join(', ')}. Nejlepší: ${winner.nameShort}${winnerScore}.`

  return {
    title: `${names} — porovnání`,
    description: desc.slice(0, 160),
  }
}

export default async function ComparatorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const ids = parseIds(params)
  const allProducts = await getProductsWithOffers()
  // Resolve serverItems in URL order so SSR table matches user's intent
  const serverItems = ids
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is (typeof allProducts)[number] => !!p)

  // Legacy URL redirect: pokud má ?ids= a všechny ID se rozeznali, přesměruj
  // na pretty slug URL pro SEO + sdílitelnost. Min 2 oleje aby slug byl
  // smysluplný — pro 1 olej zůstaň na /porovnani s předvyplněním.
  if (serverItems.length >= 2 && serverItems.length === ids.length) {
    const slugUrl = `/porovnani/${serverItems.map((p) => p.slug).join('-vs-')}`
    redirect(slugUrl)
  }

  return (
    <Suspense fallback={<div className="p-10 text-center text-text3">Načítání...</div>}>
      <ComparatorContent allProducts={allProducts} serverItems={serverItems} />
    </Suspense>
  )
}
