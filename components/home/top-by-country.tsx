// Sekce "Top oleje per země" — 3 nejlepší z každé hlavní originu.
// Zobrazuje GR, ES, IT (+ HR a PT pokud mají dostatek produktů).

import Link from 'next/link'
import { countryFlag, countryName, formatPrice } from '@/lib/utils'
import { ScoreBadge } from '@/components/score-badge'
import { ProductImage } from '@/components/product-image'
import { diverseTopProducts } from '@/lib/product-selection'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

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
              {/* Country header */}
              <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
                <h3 className="text-[22px] font-[family-name:var(--font-display)] font-normal text-text">
                  {countryFlag(code)} Nejlepší {countryAdjectivePlural(code)} oleje
                  <span className="text-[15px] font-normal text-text3 ml-2 font-sans">({total})</span>
                </h3>
                <Link
                  href={`/srovnavac?country=${code}`}
                  className="text-[12px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap"
                >
                  Zobrazit všechny →
                </Link>
              </div>

              {/* Top 3 cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {top3.map((p) => (
                  <Link
                    key={p.id}
                    href={`/olej/${p.slug}`}
                    className="group bg-white border border-off2 rounded-[var(--radius-card)] p-4 hover:border-olive-border hover:shadow-sm transition-all flex flex-col"
                  >
                    {/* Image */}
                    <div className="w-full aspect-square relative mb-3 rounded-lg overflow-hidden bg-off/60">
                      <ProductImage
                        product={{ imageUrl: p.imageUrl ?? null, name: p.name }}
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                      {p.olivatorScore != null && (
                        <div className="absolute top-2 right-2">
                          <ScoreBadge score={p.olivatorScore} size="small" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1">
                      <div className="text-[14px] font-medium text-text leading-snug mb-auto line-clamp-2">
                        {p.nameShort ?? p.name}
                      </div>

                      {p.cheapestOffer && (
                        <div className="mt-3 pt-3 border-t border-off flex items-center justify-between">
                          <div>
                            <div className="text-[16px] font-bold text-text">
                              {formatPrice(p.cheapestOffer.price)}
                            </div>
                            <div className="text-[11px] text-text3">
                              u {p.cheapestOffer.retailer.name}
                            </div>
                          </div>
                          <div className="text-[12px] font-medium text-olive group-hover:underline">
                            Detail →
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
