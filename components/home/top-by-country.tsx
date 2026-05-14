// Sekce "Top oleje per země" — 3 nejlepší z každé hlavní originu.
// Používá TopProductCard — shodný vzhled s TOP 12 sekcí.

import Link from 'next/link'
import { countryName } from '@/lib/utils'
import { TopProductCard, type ProductWithOffer } from '@/components/home/top-product-card'
import { diverseTopProducts } from '@/lib/product-selection'

interface Props {
  products: ProductWithOffer[]
}

const COUNTRIES: Array<{ code: string; minProducts: number }> = [
  { code: 'GR', minProducts: 3 },
  { code: 'ES', minProducts: 3 },
  { code: 'IT', minProducts: 3 },
  { code: 'HR', minProducts: 3 },
  { code: 'PT', minProducts: 3 },
]

function countryAdjectivePlural(code: string): string {
  const map: Record<string, string> = {
    GR: 'řecké', ES: 'španělské', IT: 'italské', HR: 'chorvatské', PT: 'portugalské',
  }
  return map[code] ?? countryName(code)
}

export function TopByCountry({ products }: Props) {
  const sections = COUNTRIES.map(({ code, minProducts }) => {
    const byCountry = products.filter(
      (p) => p.originCountry === code && p.cheapestOffer != null && p.olivatorScore != null,
    )
    if (byCountry.length < minProducts) return null

    const top3 = diverseTopProducts(byCountry, 3, 1)
    return { code, total: byCountry.length, top3 }
  }).filter(Boolean) as Array<{ code: string; total: number; top3: ProductWithOffer[] }>

  if (sections.length === 0) return null

  return (
    <section className="px-6 md:px-10 py-16 border-t border-off2">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
          — Podle původu
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight mb-10">
          Nejlepší oleje podle země.
        </h2>

        <div className="space-y-12">
          {sections.map(({ code, total, top3 }) => (
            <div key={code}>
              <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
                <h3 className="text-[22px] font-[family-name:var(--font-display)] font-normal text-text flex items-center gap-2 flex-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                    alt={countryName(code)}
                    title={countryName(code)}
                    width={20}
                    height={15}
                    className="inline-block rounded-sm shadow-sm shrink-0"
                  />
                  Nejlepší {countryAdjectivePlural(code)} oleje
                  <span className="text-[15px] font-normal text-text3 font-sans">({total})</span>
                </h3>
                <Link
                  href={`/srovnavac?country=${code}`}
                  className="text-[12px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap"
                >
                  Zobrazit všechny →
                </Link>
              </div>

              {/* Stejný grid jako TOP 12 — 2 col mobile → 3 tablet → 6 desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
                {top3.map((p, i) => (
                  <TopProductCard
                    key={p.id}
                    product={p}
                    rank={i + 1}
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
