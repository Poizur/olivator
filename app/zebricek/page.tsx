import Link from 'next/link'
import { getActiveRankings } from '@/lib/rankings-db'
import { getRankings as getStaticRankings } from '@/lib/static-content'

export const metadata = {
  title: 'Žebříčky olivových olejů',
  description: 'Přehled žebříčků — nejlepší oleje podle Olivator Score, původu, certifikace a ceny.',
  alternates: { canonical: 'https://olivator.cz/zebricek' },
}

export const revalidate = 3600

export default async function ZebrickyPage() {
  // DB-first, fallback na static (pre-migration period).
  const dbRankings = await getActiveRankings()
  const rankings = dbRankings.length > 0
    ? dbRankings
    : getStaticRankings().map((r) => ({
        slug: r.slug,
        title: r.title,
        description: r.description ?? null,
        emoji: r.emoji ?? null,
        productSlugs: r.productIds,
      }))

  return (
    <div className="max-w-[1080px] mx-auto px-10 py-10">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-1.5">
          Žebříčky
        </h1>
        <p className="text-[15px] text-text2 font-light">
          Objektivní hodnocení dle Olivator Score
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rankings.map(r => (
          <Link
            key={r.slug}
            href={`/zebricek/${r.slug}`}
            className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 flex items-start gap-4 transition-all hover:border-olive-light hover:shadow-[0_8px_24px_rgba(0,0,0,.06)] hover:-translate-y-0.5"
          >
            <span className="text-4xl">{r.emoji ?? '📊'}</span>
            <div>
              <div className="text-base font-medium text-text mb-1">{r.title}</div>
              <div className="text-[13px] text-text2 font-light">{r.description ?? ''}</div>
              <div className="text-xs text-olive mt-2">
                {r.productSlugs.length > 0 ? `${r.productSlugs.length} olejů →` : 'Detail →'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
