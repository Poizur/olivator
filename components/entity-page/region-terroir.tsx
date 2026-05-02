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
      <div className="max-w-[1280px] mx-auto bg-olive-bg/40 rounded-[var(--radius-card)] p-6 md:p-10">
        {/* Header s mini-mapou vpravo */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              — Terroir a krajina
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text leading-tight">
              Co je pro {regionName} typické
            </h2>
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

        {/* 3-sloupcový grid s photo headers */}
        <div className={`grid gap-5 md:gap-6 ${visible.length === 3 ? 'md:grid-cols-3' : visible.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          {visible.map((col, i) => {
            const photo = columnPhotos[i] ?? null
            return (
              <div
                key={col.key}
                className="bg-white rounded-[var(--radius-card)] overflow-hidden border border-olive-border/40"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 text-white">
                      <span className="text-[10px] font-bold tracking-widest uppercase opacity-90">
                        {col.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-olive-bg/60 px-5 py-3 flex items-center gap-2">
                    <span className="text-base">{col.fallbackEmoji}</span>
                    <span className="text-[11px] font-bold tracking-widest uppercase text-olive-dark">
                      {col.label}
                    </span>
                  </div>
                )}
                <div className="px-5 py-5">
                  <p className="text-[14px] text-text2 font-light leading-[1.65]">
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
