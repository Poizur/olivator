import Link from 'next/link'
import { countryFlag, countryName } from '@/lib/utils'
import type { BrandTile } from '@/lib/data'

const FALLBACK_COLORS = [
  '#1b4332', '#2d6a4f', '#40916c', '#c4711a', '#6b4226', '#394251',
]

function brandFallbackColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length]
}

export function FeaturedBrandsSection({ brands }: { brands: BrandTile[] }) {
  if (brands.length === 0) return null

  return (
    <section className="px-6 md:px-10 py-16 bg-off/40 border-y border-off2">
      <div className="max-w-[1280px] mx-auto">

        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
              — Značky
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
              Top značky olivového oleje
            </h2>
            <p className="text-[14px] text-text2 mt-1.5 max-w-[460px]">
              Prémiové rodiny a kooperativy, které za svými oleji stojí jménem.
            </p>
          </div>
          <Link
            href="/znacky"
            className="text-[13px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap hidden sm:block"
          >
            Všechny značky →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {brands.map((b) => {
            const logo = b.logoUrl ?? null
            const hero = b.heroUrl ?? null

            return (
              <Link
                key={b.slug}
                href={`/znacka/${b.slug}`}
                className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden hover:border-olive-light hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
              >
                {/* Logo / hero area */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  {hero ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={hero}
                        alt={b.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      {logo && (
                        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded px-2 py-1 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logo} alt={`${b.name} logo`} className="h-4 w-auto object-contain" />
                        </div>
                      )}
                    </>
                  ) : logo ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white p-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo}
                        alt={b.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                      style={{ backgroundColor: brandFallbackColor(b.name) }}
                    >
                      <div className="font-[family-name:var(--font-display)] text-[64px] font-normal italic text-white/30 leading-none select-none">
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/20 select-none">
                        {b.name.slice(0, 12)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="text-[10px] text-text3 mb-0.5 uppercase tracking-widest font-medium">
                    {countryFlag(b.countryCode)} {countryName(b.countryCode)}
                  </div>
                  <div className="text-[14px] font-semibold text-text leading-tight mb-0.5 truncate">
                    {b.name}
                  </div>
                  <div className="text-[11px] text-text3">
                    {b.productCount} {b.productCount === 1 ? 'produkt' : b.productCount < 5 ? 'produkty' : 'produktů'}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-4 sm:hidden text-center">
          <Link href="/znacky" className="text-[13px] text-olive font-semibold hover:text-olive2">
            Všechny značky →
          </Link>
        </div>

      </div>
    </section>
  )
}
