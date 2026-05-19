import Link from 'next/link'
import { countryName } from '@/lib/utils'
import type { RegionTile } from '@/lib/data'

const FALLBACK_COLORS = [
  '#1b4332', // olive-dark
  '#2d6a4f', // olive
  '#40916c', // olive-light
  '#c4711a', // terra
  '#6b4226', // warm brown
  '#394251', // dark slate
]

function regionFallbackColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length]
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {regions.slice(0, 10).map((r) => (
            <Link
              key={r.slug}
              href={`/oblast/${r.slug}`}
              className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden hover:border-olive-light hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                {r.photoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.photoUrl}
                      alt={r.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{ backgroundColor: regionFallbackColor(r.name) }}
                  >
                    <div className="font-[family-name:var(--font-display)] text-[64px] font-normal italic text-white/30 leading-none select-none">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/20 select-none">
                      {r.name.slice(0, 12)}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-[10px] text-text3 mb-0.5 uppercase tracking-widest font-medium">
                  {countryName(r.countryCode)}
                </div>
                <div className="text-[14px] font-semibold text-text leading-tight mb-0.5 truncate">
                  {r.name}
                </div>
                <div className="text-[11px] text-text3">
                  {r.productCount} {r.productCount === 1 ? 'olej' : r.productCount < 5 ? 'oleje' : 'olejů'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
