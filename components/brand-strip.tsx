import Link from 'next/link'
import { countryFlag, countryName } from '@/lib/utils'
import type { BrandTile } from '@/lib/data'

export function BrandStrip({ brands }: { brands: BrandTile[] }) {
  if (brands.length === 0) return null

  return (
    <section className="bg-off/40 border-y border-off2 py-16 px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
              🏛 Výrobci, kterým věříme
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
              Lidé za lahvemi.
            </h2>
            <p className="text-[14px] text-text2 mt-1.5 max-w-[460px]">
              Malé rodinné farmy i prověřené značky. Bez prostředníků, bez private label hraček.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {brands.slice(0, 10).map((b) => (
            <Link
              key={b.slug}
              href={`/znacka/${b.slug}`}
              className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden hover:border-olive-light hover:shadow-md transition-all"
            >
              <div className="aspect-[4/3] relative bg-gradient-to-br from-olive-bg/40 to-off">
                {b.photoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.photoUrl}
                      alt={b.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-50">
                    {countryFlag(b.countryCode)}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-[10px] text-text3 mb-0.5 flex items-center gap-1">
                  <span>{countryFlag(b.countryCode)}</span>
                  <span>{countryName(b.countryCode)}</span>
                </div>
                <div className="text-[14px] font-semibold text-text leading-tight mb-0.5 truncate">
                  {b.name}
                </div>
                <div className="text-[11px] text-text3">
                  {b.productCount} {b.productCount === 1 ? 'produkt' : b.productCount < 5 ? 'produkty' : 'produktů'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
