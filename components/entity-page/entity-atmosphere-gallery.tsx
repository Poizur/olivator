// Mosaic gallery — využití fotek které neskončily v hero ani v editorial story.
// Layout: 1 velká vlevo + 4 menší vpravo (2x2). Pokud máme méně než 5 fotek,
// degradujeme na jednoduchý grid.

interface GalleryPhoto {
  url: string
  alt: string | null
}

interface Props {
  photos: GalleryPhoto[]
  title?: string
  subtitle?: string
}

export function EntityAtmosphereGallery({
  photos,
  title = 'Atmosféra místa',
  subtitle,
}: Props) {
  if (photos.length === 0) return null

  // Méně než 3 fotky — nevykreslujeme samostatnou galerii (málo na visual impact)
  if (photos.length < 3) return null

  const featured = photos[0]
  const rest = photos.slice(1, 5) // max 4 do mosaiky

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              — Galerie
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-text3 mt-1 font-light">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Mosaic 1 + 4 layout — desktop. Mobile: jednoduchý 2-col grid. */}
        {rest.length >= 2 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {/* Velká fotka — 2 sloupce na desktop, 2 řádky výška */}
            <div className="col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto md:min-h-[420px] relative rounded-[var(--radius-card)] overflow-hidden bg-off group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.url}
                alt={featured.alt ?? title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                loading="lazy"
              />
              {featured.alt && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <p className="text-white text-[12px] font-light leading-snug">
                    {featured.alt}
                  </p>
                </div>
              )}
            </div>

            {/* 4 malé */}
            {rest.map((p, i) => (
              <div
                key={i}
                className="aspect-square md:aspect-[4/3] relative rounded-[var(--radius-card)] overflow-hidden bg-off group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.alt ?? `${title} ${i + 2}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          // Méně fotek — jednoduchý grid
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.slice(0, 3).map((p, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden bg-off"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.alt ?? `${title} ${i + 1}`}
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
