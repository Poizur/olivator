// Blok 6 pro oblast: terroir — 3 sloupce (Klima / Půda / Tradice) s photo headers.
// Mini-mapa země je pod nadpisem v levém horním rohu sekce.
// Fotky tematicky odpovídají sloupci — pokud nejsou, sloupec je čistě textový.

import { RegionMap } from './region-map'

interface Terroir {
  climate?: string
  soil?: string
  tradition?: string
}

interface ColumnPhoto {
  url: string
  alt: string | null
}

interface Props {
  regionSlug: string
  regionName: string
  countryCode: string
  countryName: string
  terroir: Terroir | null
  /** 0-3 fotky pro hlavičky sloupců (Klima/Půda/Tradice). */
  columnPhotos?: ColumnPhoto[]
}

interface ColumnConfig {
  key: 'climate' | 'soil' | 'tradition'
  label: string
  body: string | undefined
  fallbackEmoji: string
}

export function RegionTerroir({
  regionSlug,
  regionName,
  countryCode,
  countryName,
  terroir,
  columnPhotos = [],
}: Props) {
  const hasContent = terroir && (terroir.climate || terroir.soil || terroir.tradition)
  if (!hasContent) return null

  const columns: ColumnConfig[] = [
    { key: 'climate', label: 'Klima', body: terroir?.climate, fallbackEmoji: '☀️' },
    { key: 'soil', label: 'Půda', body: terroir?.soil, fallbackEmoji: '🪨' },
    { key: 'tradition', label: 'Tradice', body: terroir?.tradition, fallbackEmoji: '🌿' },
  ]
  const visible = columns.filter((c) => c.body)

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto bg-olive-bg/40 rounded-[var(--radius-card)] p-6 md:p-8">
        {/* Header — title vlevo, mini-mapa vpravo, zarovnané nahoře aby nebylo prázdno */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              — Terroir a krajina
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text leading-tight mb-3">
              Co je pro {regionName} typické
            </h2>
            <p className="text-sm text-text3 font-light max-w-[480px] leading-relaxed">
              Tři přírodní faktory které dělají {regionName} ideálním místem pro pěstování oliv.
            </p>
          </div>
          <div className="shrink-0">
            <RegionMap
              regionSlug={regionSlug}
              regionName={regionName}
              countryCode={countryCode}
              countryName={countryName}
            />
          </div>
        </div>

        {/* 3-sloupcový grid */}
        <div className={`grid gap-4 md:gap-5 ${visible.length === 3 ? 'md:grid-cols-3' : visible.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          {visible.map((col, i) => {
            const photo = columnPhotos[i] ?? null

            // S fotkou: photo header + text. Bez fotky: čistá plain karta s pillem.
            return (
              <div
                key={col.key}
                className="bg-white rounded-[var(--radius-card)] overflow-hidden border border-olive-border/40 flex flex-col"
              >
                {photo ? (
                  <div className="relative aspect-[16/9] bg-off">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.alt ?? `${regionName} — ${col.label}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
                      <span className="text-base">{col.fallbackEmoji}</span>
                      <span className="text-[11px] font-bold tracking-widest uppercase">
                        {col.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  // Bez fotky: žádný fake photo header — jen vertikální accent + pill
                  <div className="px-6 pt-5 pb-2 border-l-[3px] border-olive">
                    <div className="inline-flex items-center gap-1.5 bg-olive-bg/70 text-olive-dark text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">
                      <span className="text-[12px]">{col.fallbackEmoji}</span>
                      {col.label}
                    </div>
                  </div>
                )}
                <div className={`flex-1 ${photo ? 'px-5 py-5' : 'px-6 pb-6 pt-3'}`}>
                  <p className="text-[14px] text-text2 font-light leading-[1.7]">
                    {col.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
