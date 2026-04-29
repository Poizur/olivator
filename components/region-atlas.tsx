import Link from 'next/link'
import { countryFlag, countryName } from '@/lib/utils'
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
              🗺 Atlas regionů
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
              Olej má adresu.
            </h2>
            <p className="text-[14px] text-text2 mt-1.5 max-w-[460px]">
              Každý olej někde roste — a chuť to pozná. Prozkoumej regiony, ze kterých pocházejí naše oleje.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {regions.slice(0, 8).map((r) => {
            const genitive = GENITIVE[r.slug] ?? r.name
            return (
              <Link
                key={r.slug}
                href={`/oblast/${r.slug}`}
                className="group relative aspect-[4/5] rounded-[var(--radius-card)] overflow-hidden bg-gradient-to-br from-olive-dark to-olive2 hover:scale-[1.02] transition-transform"
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
                  <div className="absolute inset-0 flex items-center justify-center text-[80px] opacity-40">
                    {countryFlag(r.countryCode)}
                  </div>
                )}

                <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                  <div className="text-[10px] font-medium tracking-widest uppercase text-white/70 mb-1 flex items-center gap-1">
                    <span>{countryFlag(r.countryCode)}</span>
                    <span>{countryName(r.countryCode)}</span>
                  </div>
                  <div className="font-[family-name:var(--font-display)] text-2xl font-normal leading-tight mb-0.5">
                    {r.name}
                  </div>
                  <div className="text-[12px] text-white/70">
                    {r.productCount} {r.productCount === 1 ? 'olej' : r.productCount < 5 ? 'oleje' : 'olejů'} z {genitive}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
