// Sekce "Top oleje per země" — 6 nejlepších z každé hlavní originu.
// Používá TopProductCard — shodný vzhled s TOP 12 sekcí.

import Link from 'next/link'
import { countryName, countryFlag } from '@/lib/utils'
import { TopProductCard, type ProductWithOffer } from '@/components/home/top-product-card'
import { diverseTopProducts } from '@/lib/product-selection'

interface Props {
  products: ProductWithOffer[]
}

const COUNTRIES: Array<{ code: string; minProducts: number }> = [
  { code: 'GR', minProducts: 6 },
  { code: 'ES', minProducts: 6 },
  { code: 'IT', minProducts: 6 },
  { code: 'HR', minProducts: 4 },
  { code: 'PT', minProducts: 4 },
]

// Národní barvy pro vizuální identifikaci — primary = nejreprezentativnější barva
const COUNTRY_COLOR: Record<string, string> = {
  GR: '#0D5EAF', // řecká modrá
  IT: '#009246', // italská zelená
  ES: '#AA151B', // španělská červená
  HR: '#171796', // chorvatská modrá
  PT: '#006600', // portugalská zelená
  TN: '#E70013', // tuniská červená
  TR: '#E30A17', // turecká červená
}

function countryAdjectivePlural(code: string): string {
  const map: Record<string, string> = {
    GR: 'řecké', ES: 'španělské', IT: 'italské', HR: 'chorvatské', PT: 'portugalské',
    TN: 'tuniské', TR: 'turecké',
  }
  return map[code] ?? countryName(code)
}

export function TopByCountry({ products }: Props) {
  const sections = COUNTRIES.map(({ code, minProducts }) => {
    const byCountry = products.filter(
      (p) => p.originCountry === code && p.cheapestOffer != null && p.olivatorScore != null,
    )
    if (byCountry.length < minProducts) return null

    const top6 = diverseTopProducts(byCountry, 6, 2)
    return { code, total: byCountry.length, top6 }
  }).filter(Boolean) as Array<{ code: string; total: number; top6: ProductWithOffer[] }>

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

        <div className="space-y-14">
          {sections.map(({ code, total, top6 }) => {
            const color = COUNTRY_COLOR[code] ?? '#2d6a4f'
            const flag = countryFlag(code)
            return (
              <div key={code}>
                {/* ── Hlavička sekce s barevným spodním okrajem ── */}
                <div
                  className="flex items-center justify-between mb-6 pb-4 flex-wrap gap-3"
                  style={{ borderBottom: `3px solid ${color}` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Velká vlajka — hlavní vizuální identifikátor */}
                    <span
                      className="text-5xl leading-none select-none shrink-0"
                      role="img"
                      aria-label={countryName(code)}
                    >
                      {flag}
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl md:text-[28px] font-normal text-text leading-tight">
                        Nejlepší {countryAdjectivePlural(code)} oleje
                      </h3>
                      <span className="text-[12px] text-text3">
                        {total} produktů v databázi
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/srovnavac?country=${code}`}
                    className="text-[12px] font-semibold hover:underline whitespace-nowrap"
                    style={{ color }}
                  >
                    Zobrazit všechny →
                  </Link>
                </div>

                {/* ── Grid karet s barevnou čepičkou ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
                  {top6.map((p, i) => (
                    // Wrapper přidá 3px barevný proužek nahoře — funguje s overflow-hidden uvnitř
                    <div
                      key={p.id}
                      className="rounded-[var(--radius-card)] overflow-hidden"
                      style={{ borderLeft: `4px solid ${color}` }}
                    >
                      <TopProductCard
                        product={p}
                        rank={i + 1}
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
