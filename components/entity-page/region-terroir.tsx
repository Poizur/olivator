// Blok 6 pro oblast: terroir (klima + půda + tradice).
// Brief.md: SVG mapa + 3 odstavce o regionu, NIKOLI o odrůdách.
// Mapa je zatím placeholder ikona — později nahradím SVG vector outlines.

interface Terroir {
  climate?: string
  soil?: string
  tradition?: string
}

interface Props {
  regionName: string
  countryName: string
  terroir: Terroir | null
  /** Volitelné fotky farem — později z entity_images.tag='farm'. */
  farmPhotos?: Array<{ url: string; alt: string | null }>
}

export function RegionTerroir({ regionName, countryName, terroir, farmPhotos = [] }: Props) {
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
          {/* Placeholder mini-mapa (SVG vektor přijde později) */}
          <div className="aspect-square bg-white rounded-[var(--radius-card)] border border-off2 flex flex-col items-center justify-center p-6">
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 text-olive/40"
              fill="currentColor"
            >
              <path d="M50 5 C 30 25, 30 65, 50 95 C 70 65, 70 25, 50 5 Z M50 35 a8 8 0 1 0 0 16 a8 8 0 1 0 0 -16 Z" />
            </svg>
            <div className="text-[11px] text-text2 mt-2 text-center font-medium">{regionName}</div>
            <div className="text-[10px] text-text3 text-center">{countryName}</div>
          </div>

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
