// Blok 6 pro oblast: terroir (klima + půda + tradice).
// Brief.md: SVG mapa + 3 odstavce o regionu, NIKOLI o odrůdách.

import { RegionMap } from './region-map'

interface Terroir {
  climate?: string
  soil?: string
  tradition?: string
}

interface Props {
  regionSlug: string
  regionName: string
  countryCode: string
  countryName: string
  terroir: Terroir | null
  /** Volitelné fotky farem — později z entity_images.tag='farm'. */
  farmPhotos?: Array<{ url: string; alt: string | null }>
}

export function RegionTerroir({
  regionSlug,
  regionName,
  countryCode,
  countryName,
  terroir,
  farmPhotos = [],
}: Props) {
  const hasContent = terroir && (terroir.climate || terroir.soil || terroir.tradition)
  if (!hasContent && farmPhotos.length === 0) return null

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto bg-olive-bg/40 rounded-[var(--radius-card)] p-6 md:p-8">
        <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-3">
          — Terroir a krajina
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text mb-6">
          Co je pro {regionName} typické
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 items-start">
          {/* Mini-mapa země s markerem regionu */}
          <RegionMap
            regionSlug={regionSlug}
            regionName={regionName}
            countryCode={countryCode}
            countryName={countryName}
          />

          <div className="space-y-4">
            {terroir?.climate && (
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive mb-1.5">
                  Klima
                </h3>
                <p className="text-[14px] text-text2 font-light leading-relaxed">{terroir.climate}</p>
              </div>
            )}
            {terroir?.soil && (
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive mb-1.5">
                  Půda
                </h3>
                <p className="text-[14px] text-text2 font-light leading-relaxed">{terroir.soil}</p>
              </div>
            )}
            {terroir?.tradition && (
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive mb-1.5">
                  Tradice
                </h3>
                <p className="text-[14px] text-text2 font-light leading-relaxed">{terroir.tradition}</p>
              </div>
            )}
            {!hasContent && (
              <p className="text-[14px] text-text3 italic font-light">
                Detaily o klimatu, půdě a tradici této oblasti se připravují.
              </p>
            )}
          </div>
        </div>

        {farmPhotos.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {farmPhotos.slice(0, 4).map((photo, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden bg-off"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.alt ?? `${regionName} farma ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
