// SVG mini-mapy zemí pro RegionTerroir blok.
// Každá země: zjednodušený SVG path (viewBox 0 0 100 100).
// Region: souřadnice v rámci viewBoxu země (cx, cy v %).
//
// Cíl: vizuálně odlišit "kde to je v zemi", ne kartograficky přesné.
// Path data jsou ručně zjednodušená — drží se siluety, ale ignorují detail.

export interface CountryMap {
  viewBox: string
  /** SVG path d="" — siluety pevninské části */
  path: string
  /** Volitelné odlehlé části (ostrovy, samostatné landmassy) */
  islands?: string[]
  /** České jméno země pro popisek */
  label: string
}

export interface RegionPosition {
  countryCode: string
  /** Souřadnice v viewBox 0-100 */
  cx: number
  cy: number
  /** Velikost markeru (0-15). Větší = výraznější region. */
  r?: number
}

// ────────────────────────────────────────────────────────────────────────
// COUNTRY SHAPES (zjednodušené)
// ────────────────────────────────────────────────────────────────────────

export const COUNTRY_MAPS: Record<string, CountryMap> = {
  // Itálie — bota
  IT: {
    viewBox: '0 0 100 100',
    label: 'Itálie',
    path:
      'M 28,8 L 38,6 L 48,8 L 58,5 L 68,8 L 72,15 L 70,22 L 64,28 L 60,35 L 65,40 ' +
      'L 72,45 L 75,52 L 78,60 L 76,68 L 72,72 L 68,68 L 64,70 L 60,75 L 58,82 ' +
      'L 55,85 L 50,80 L 45,72 L 42,65 L 40,58 L 38,50 L 36,42 L 34,35 L 30,28 ' +
      'L 26,20 Z',
    islands: [
      // Sicílie (jihozápadně)
      'M 18,88 L 28,85 L 35,88 L 38,93 L 32,96 L 22,95 L 16,92 Z',
      // Sardínie (vlevo)
      'M 8,55 L 14,52 L 16,60 L 14,68 L 10,70 L 6,65 Z',
    ],
  },

  // Řecko — pevnina + Kréta + Egejské ostrovy
  GR: {
    viewBox: '0 0 100 100',
    label: 'Řecko',
    path:
      'M 22,15 L 35,12 L 48,18 L 55,15 L 62,22 L 70,28 L 68,38 L 72,45 L 65,52 ' +
      'L 58,58 L 50,55 L 42,62 L 35,70 L 30,75 L 25,72 L 22,65 L 25,58 L 22,50 ' +
      'L 20,42 L 18,32 L 20,22 Z',
    islands: [
      // Kréta (jih)
      'M 38,90 L 55,88 L 62,91 L 58,95 L 45,96 L 38,93 Z',
      // Korfu (severozápad)
      'M 5,32 L 9,30 L 10,38 L 7,40 Z',
      // Lesbos (východ)
      'M 78,38 L 84,36 L 86,42 L 82,46 L 78,42 Z',
      // Zakynthos (západ)
      'M 12,62 L 17,60 L 18,66 L 13,68 Z',
    ],
  },

  // Španělsko — pětiúhelník Iberského poloostrova
  ES: {
    viewBox: '0 0 100 100',
    label: 'Španělsko',
    path:
      'M 12,18 L 22,12 L 35,15 L 48,12 L 62,18 L 75,15 L 88,22 L 92,32 L 90,42 ' +
      'L 88,55 L 92,65 L 90,75 L 82,82 L 70,85 L 55,82 L 40,80 L 28,82 L 20,78 ' +
      'L 14,70 L 10,60 L 8,48 L 6,35 L 9,25 Z',
  },

  // Portugalsko — úzký pruh na západě Pyrenejského pol.
  PT: {
    viewBox: '0 0 100 100',
    label: 'Portugalsko',
    path:
      'M 30,12 L 55,10 L 65,18 L 70,28 L 72,42 L 75,55 L 78,68 L 75,80 L 68,88 ' +
      'L 55,92 L 42,90 L 32,82 L 28,72 L 30,60 L 25,48 L 28,35 L 32,22 Z',
  },

  // Chorvatsko — úzký U podél Jaderského moře
  HR: {
    viewBox: '0 0 100 100',
    label: 'Chorvatsko',
    path:
      'M 18,25 L 35,18 L 50,22 L 60,28 L 55,38 L 50,42 L 45,48 L 50,55 L 60,62 ' +
      'L 70,68 L 78,72 L 82,80 L 78,88 L 68,85 L 58,78 L 48,72 L 38,65 L 28,55 ' +
      'L 22,45 L 20,35 Z',
  },

  // Tunisko
  TN: {
    viewBox: '0 0 100 100',
    label: 'Tunisko',
    path:
      'M 32,8 L 48,6 L 58,12 L 65,22 L 70,35 L 68,48 L 65,60 L 60,72 L 55,82 ' +
      'L 50,88 L 45,85 L 40,75 L 35,62 L 30,48 L 28,35 L 30,22 Z',
  },

  // Maroko
  MA: {
    viewBox: '0 0 100 100',
    label: 'Maroko',
    path:
      'M 8,20 L 25,15 L 45,12 L 65,18 L 78,28 L 85,42 L 82,55 L 75,65 L 65,72 ' +
      'L 50,75 L 35,72 L 22,65 L 12,52 L 8,38 L 6,28 Z',
  },

  // Turecko
  TR: {
    viewBox: '0 0 100 100',
    label: 'Turecko',
    path:
      'M 5,30 L 18,25 L 32,28 L 48,25 L 62,28 L 78,32 L 92,35 L 95,45 L 92,55 ' +
      'L 85,62 L 72,65 L 58,62 L 45,58 L 32,55 L 22,52 L 12,48 L 6,42 Z',
  },
}

// ────────────────────────────────────────────────────────────────────────
// REGION POSITIONS — souřadnice v viewBoxu země (0-100)
// ────────────────────────────────────────────────────────────────────────

export const REGION_POSITIONS: Record<string, RegionPosition> = {
  // Itálie
  apulie: { countryCode: 'IT', cx: 70, cy: 65, r: 6 },
  toskansko: { countryCode: 'IT', cx: 45, cy: 35, r: 6 },
  sicilie: { countryCode: 'IT', cx: 27, cy: 91, r: 7 },
  kalabrie: { countryCode: 'IT', cx: 60, cy: 78, r: 5 },
  // Řecko
  kreta: { countryCode: 'GR', cx: 50, cy: 92, r: 7 },
  peloponnes: { countryCode: 'GR', cx: 30, cy: 70, r: 6 },
  korfu: { countryCode: 'GR', cx: 7, cy: 35, r: 4 },
  zakynthos: { countryCode: 'GR', cx: 15, cy: 64, r: 4 },
  lesbos: { countryCode: 'GR', cx: 82, cy: 41, r: 4 },
  // Španělsko
  andalusie: { countryCode: 'ES', cx: 30, cy: 75, r: 7 },
  katalansko: { countryCode: 'ES', cx: 75, cy: 25, r: 6 },
  estremadura: { countryCode: 'ES', cx: 22, cy: 50, r: 6 },
  // Portugalsko
  alentejo: { countryCode: 'PT', cx: 50, cy: 70, r: 7 },
}

/** Normalize slug pro lookup: lowercase + strip diakritiky. */
function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Vrací data pro vykreslení mapy regionu — country path + position markeru.
 * Pokud region nebo země nejsou v datasetu, vrátí null.
 */
export function getRegionMap(
  regionSlug: string,
  countryCode?: string | null
): { country: CountryMap; position: RegionPosition } | null {
  const position = REGION_POSITIONS[normalizeSlug(regionSlug)]
  if (position) {
    const country = COUNTRY_MAPS[position.countryCode]
    if (country) return { country, position }
  }
  // Fallback: máme zemi, ale neznámý region — markered střed
  if (countryCode && COUNTRY_MAPS[countryCode]) {
    return {
      country: COUNTRY_MAPS[countryCode],
      position: { countryCode, cx: 50, cy: 50, r: 5 },
    }
  }
  return null
}
