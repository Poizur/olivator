import Link from 'next/link'
import { countryName } from '@/lib/utils'
import type { RegionTile } from '@/lib/data'

const GENITIVE: Record<string, string> = {
  kreta: 'Kréty',
  peloponnes: 'Peloponésu',
  apulie: 'Apulie',
  korfu: 'Korfu',
  zakynthos: 'Zakynthosu',
  toskansko: 'Toskánska',
  sicilie: 'Sicílie',
  kalabrie: 'Kalábrie',
  andalusie: 'Andalusie',
  lesbos: 'Lesbosu',
  alentejo: 'Alenteja',
  katalansko: 'Katalánska',
  estremadura: 'Estremadury',
}

export function RegionAtlas({ regions }: { regions: RegionTile[] }) {
  if (regions.length === 0) return null

  return (
    <section className="py-16 px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
              — Atlas regionů
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
              Olej má adresu.
            </h2>
            <p className="text-[14px] text-text2 mt-1.5 max-w-[460px]">
              Každý olej někde roste — a chuť to pozná. Prozkoumej regiony, ze kterých pocházejí naše oleje.
            </p>
          </div>
        </div>

        {/* Hero region (první největší) + grid zbývajících 7
            Layout: 1 velká dlaždice 2×2 + 4 menší vedle, pak řada 4 malých.
            Celkově 8 regionů, ale s vizuální hierarchií. */}
        <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-3 md:gap-4">
          {regions.slice(0, 8).map((r, i) => {
            const genitive = GENITIVE[r.slug] ?? r.name
            const isHero = i === 0  // první regionem je hero (2×2)
            return (
              <Link
                key={r.slug}
                href={`/oblast/${r.slug}`}
                className={`group relative rounded-[var(--radius-card)] overflow-hidden bg-olive-dark hover:scale-[1.02] transition-transform ${
                  isHero
                    ? 'col-span-2 row-span-2 aspect-square md:aspect-auto'
                    : 'aspect-[4/5]'
                }`}
              >
                {r.photoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.photoUrl}
                      alt={r.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`font-[family-name:var(--font-display)] font-normal italic text-white/15 leading-none select-none ${
                      isHero ? 'text-[200px]' : 'text-[120px]'
                    }`}>
                      {r.name.charAt(0)}
                    </div>
                  </div>
                )}

                <div className={`absolute inset-0 flex flex-col justify-end text-white ${
                  isHero ? 'p-6 md:p-8' : 'p-4'
                }`}>
                  <div className={`font-medium tracking-widest uppercase text-white/70 mb-1 ${
                    isHero ? 'text-[12px]' : 'text-[10px]'
                  }`}>
                    {countryName(r.countryCode)}
                  </div>
                  <div className={`font-[family-name:var(--font-display)] font-normal leading-tight mb-1 ${
                    isHero ? 'text-4xl md:text-5xl' : 'text-2xl'
                  }`}>
                    {r.name}
                  </div>
                  <div className={`text-white/80 ${isHero ? 'text-[14px]' : 'text-[12px]'}`}>
                    {r.productCount} {r.productCount === 1 ? 'olej' : r.productCount < 5 ? 'oleje' : 'olejů'} z {genitive}
                  </div>
                  {isHero && (
                    <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-white border border-white/30 rounded-full px-3 py-1.5 w-fit group-hover:bg-white group-hover:text-olive-dark transition-colors">
                      Prozkoumat oblast →
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
