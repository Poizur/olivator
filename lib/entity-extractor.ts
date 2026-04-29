// Entity extraction: brand / region / cultivar from product data.
// Used by backfill script + prospector when inserting new products.

// ── Brand extraction ─────────────────────────────────────────────────────────

// Multi-word brand prefixes → canonical slug.
// Order matters: longer matches checked first by iterating in insertion order.
const MULTI_WORD_BRANDS: [string, string][] = [
  ['terra creta', 'terra-creta'],
  ['frantoio franci', 'frantoio-franci'],
  ['evolia platinum', 'evolia-platinum'],
  ['sitia kréta', 'sitia-kreta'],
  ['sitia kreta', 'sitia-kreta'],
  ['pallada kréta', 'pallada-kreta'],
  ['pallada kreta', 'pallada-kreta'],
  ['petromilos zakynthos', 'petromilos-zakynthos'],
  ['intini extra', 'intini'],
  ['intini cima', 'intini'],
  ['corinto pelopones', 'corinto'],
  ['corinto peloponés', 'corinto'],
  ['evoilino korfu', 'evoilino'],
]

// First words that are product descriptors, not brand names.
const GENERIC_PREFIXES = new Set([
  'extra', 'prémiový', 'olivový', 'liofyto', 'organický', 'bio',
  'griechisches', 'organic', 'premium',
])

export function extractBrandSlug(name: string): string | null {
  const lower = name.toLowerCase().trim()

  for (const [pattern, slug] of MULTI_WORD_BRANDS) {
    if (lower.startsWith(pattern)) return slug
  }

  const words = lower.split(/\s+/)
  let idx = 0
  // Skip leading generic prefix words
  while (idx < words.length - 1 && GENERIC_PREFIXES.has(words[idx])) idx++

  const brandWord = words[idx]
  if (!brandWord || brandWord.length < 2) return null

  return brandWord
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Region extraction ─────────────────────────────────────────────────────────

// (country_code, origin_region text) → canonical region slug
// Values are normalised to lowercase + stripped of diacritics before lookup.
const REGION_MAP: Record<string, Record<string, string>> = {
  gr: {
    peloponnes: 'peloponnes',
    peloponés: 'peloponnes',
    pelopones: 'peloponnes',
    peloponese: 'peloponnes',
    kréta: 'kreta',
    kreta: 'kreta',
    crete: 'kreta',
    korfu: 'korfu',
    corfu: 'korfu',
    zakynthos: 'zakynthos',
    zante: 'zakynthos',
    lesbos: 'lesbos',
    lesvos: 'lesbos',
  },
  it: {
    apulie: 'apulie',
    puglia: 'apulie',
    apulia: 'apulie',
    toskánsko: 'toskánsko',
    toscana: 'toskánsko',
    tuscany: 'toskánsko',
    sicílie: 'sicilie',
    sicilia: 'sicilie',
    sicily: 'sicilie',
    kalábrie: 'kalabrie',
    calabria: 'kalabrie',
  },
  es: {
    andalusie: 'andalusie',
    andalucia: 'andalusie',
    andalucía: 'andalusie',
    katalánsko: 'katalansko',
    cataluña: 'katalansko',
    estremadura: 'estremadura',
    extremadura: 'estremadura',
  },
  pt: {
    alentejo: 'alentejo',
  },
}

function normaliseRegionKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function extractRegionSlug(countryCode: string, originRegion: string): string | null {
  if (!originRegion) return null
  const cc = countryCode.toLowerCase()
  const key = normaliseRegionKey(originRegion)
  return REGION_MAP[cc]?.[key] ?? null
}

// ── Cultivar detection ────────────────────────────────────────────────────────

interface CultivarMatch {
  slug: string
}

const CULTIVAR_PATTERNS: { slug: string; regex: RegExp }[] = [
  { slug: 'koroneiki',    regex: /koroneiki/i },
  { slug: 'manaki',       regex: /manaki/i },
  { slug: 'kalamata',     regex: /kalamata|kalamon/i },
  { slug: 'athinolia',    regex: /athinolia/i },
  { slug: 'coratina',     regex: /coratina/i },
  { slug: 'cima-di-mola', regex: /cima\s*di\s*mola/i },
  { slug: 'frantoio',     regex: /frantoio/i },
  { slug: 'leccino',      regex: /leccino/i },
  { slug: 'picual',       regex: /picual/i },
  { slug: 'hojiblanca',   regex: /hojiblanca/i },
  { slug: 'arbequina',    regex: /arbequina/i },
  { slug: 'mastoidis',    regex: /mastoidis/i },
]

export function detectCultivars(
  name: string,
  descriptionLong: string | null,
): CultivarMatch[] {
  const results: CultivarMatch[] = []

  for (const { slug, regex } of CULTIVAR_PATTERNS) {
    const inName = regex.test(name)
    const inDesc = descriptionLong ? regex.test(descriptionLong) : false

    if (inName || inDesc) {
      results.push({ slug })
    }
  }

  return results
}
