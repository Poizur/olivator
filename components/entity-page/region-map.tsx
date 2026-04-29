// Mapa regionu pro blok 6 RegionTerroir.
// Priorita:
//   1. mapImageUrl — admin nahrál vlastní obrázek (preferováno, viz admin form)
//   2. SVG fallback z lib/region-maps.ts (zjednodušená země s markerem)
//   3. Generická olive ikona

import { getRegionMap } from '@/lib/region-maps'

interface Props {
  regionSlug: string
  regionName: string
  countryCode: string
  countryName: string
  /** Volitelně: URL admin-nahraného obrázku mapy. */
  mapImageUrl?: string | null
}

export function RegionMap({
  regionSlug,
  regionName,
  countryCode,
  countryName,
  mapImageUrl,
}: Props) {
  // 1. Admin upload má vždy přednost
  if (mapImageUrl) {
    return (
      <div className="aspect-square bg-white rounded-[var(--radius-card)] border border-off2 flex flex-col p-4">
        <div className="flex-1 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapImageUrl}
            alt={`Mapa ${regionName}`}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
          />
        </div>
        <div className="text-center mt-2 shrink-0">
          <div className="text-[12px] font-medium text-text">{regionName}</div>
          <div className="text-[10px] text-text3">{countryName}</div>
        </div>
      </div>
    )
  }

  const map = getRegionMap(regionSlug, countryCode)

  if (!map) {
    // Fallback: žádná mapa, jen olive ikona
    return (
      <div className="aspect-square bg-white rounded-[var(--radius-card)] border border-off2 flex flex-col items-center justify-center p-6">
        <svg viewBox="0 0 100 100" className="w-20 h-20 text-olive/40" fill="currentColor">
          <path d="M50 5 C 30 25, 30 65, 50 95 C 70 65, 70 25, 50 5 Z M50 35 a8 8 0 1 0 0 16 a8 8 0 1 0 0 -16 Z" />
        </svg>
        <div className="text-[11px] text-text2 mt-2 text-center font-medium">{regionName}</div>
        <div className="text-[10px] text-text3 text-center">{countryName}</div>
      </div>
    )
  }

  const { country, position } = map

  return (
    <div className="aspect-square bg-white rounded-[var(--radius-card)] border border-off2 flex flex-col p-4">
      <svg viewBox={country.viewBox} className="w-full flex-1" aria-label={`Mapa ${country.label}`}>
        {/* Pozadí — silueta země */}
        <path
          d={country.path}
          fill="rgb(232 240 233)"
          stroke="rgb(45 106 79)"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        {/* Volitelné ostrovy */}
        {country.islands?.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="rgb(232 240 233)"
            stroke="rgb(45 106 79)"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        ))}
        {/* Marker regionu — pulzující kruh */}
        <circle
          cx={position.cx}
          cy={position.cy}
          r={(position.r ?? 5) + 2}
          fill="rgb(196 113 26)"
          opacity="0.25"
        />
        <circle
          cx={position.cx}
          cy={position.cy}
          r={position.r ?? 5}
          fill="rgb(196 113 26)"
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <div className="text-center mt-2 shrink-0">
        <div className="text-[12px] font-medium text-text">{regionName}</div>
        <div className="text-[10px] text-text3">{countryName}</div>
      </div>
    </div>
  )
}
