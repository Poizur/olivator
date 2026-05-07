// Entity extraction: brand / region / cultivar from product data.
// Used by backfill script + prospector when inserting new products.

// ── Brand extraction ─────────────────────────────────────────────────────────

// Multi-word brand prefixes → canonical slug.
// Order matters: longer matches checked first by iterating in insertion order.
const MULTI_WORD_BRANDS: [string, string][] = [
  ['terra creta', 'terra-creta'],
  ['frantoio franci', 'frantoio-franci'],
  ['evolia platinum', 'evolia-platinum'],
  ['gourmet partners', 'gourmet-partners'],
  ['antica sicilia', 'antica-sicilia'],
  ['sitia kréta', 'sitia-kreta'],
  ['sitia kreta', 'sitia-kreta'],
  ['sitia premium', 'sitia-kreta'],
  ['pallada kréta', 'pallada-kreta'],
  ['pallada kreta', 'pallada-kreta'],
  ['petromilos zakynthos', 'petromilos-zakynthos'],
  ['intini extra', 'intini'],
  ['intini cima', 'intini'],
  ['intini olivastra', 'intini'],
  ['intini coratina', 'intini'],
  ['intini lemon', 'intini'],
  ['intini oro', 'intini'],
  ['corinto pelopones', 'corinto'],
  ['corinto peloponés', 'corinto'],
  ['corinto aryballos', 'corinto'],
  ['evoilino korfu', 'evoilino'],
  ['theoni kalamata', 'theoni'],
  ['nikolos kalamata', 'nikolos'],
  ['orino sitia', 'orino'],
  ['orino sithia', 'orino'],
  ['adelfos zakros', 'adelfos'],
  ['motakis kréta', 'motakis'],
  ['motakis kreta', 'motakis'],
  ['plakias premium', 'plakias'],
  ['abea bio', 'abea'],
  ['iliada kalamata', 'iliada'],
  ['neotis pelopones', 'neotis'],
  ['neotis peloponés', 'neotis'],
  ['theikos kréta', 'theikos'],
  ['theikos kreta', 'theikos'],
  ['petromilos zakynthos', 'petromilos-zakynthos'],
  ['askra early', 'askra'],
]

// First words that are product descriptors, not brand names.
// Rozšířeno 2026-05-07: user reported "Extra (16), Picual (11), 15 (2), Dárkové (1)"
// jako značky v admin filtru. To jsou descriptors / cultivars / čísla balení.
const GENERIC_PREFIXES = new Set([
  // Type descriptors
  'extra', 'prémiový', 'prémium', 'premium', 'olivový', 'olej', 'olivovy',
  'panenský', 'panensky', 'organický', 'organicky', 'organic', 'bio',
  'rafinovaný', 'rafinovany', 'griechisches', 'sicilský', 'sicilsky',
  'řecký', 'recky', 'italský', 'italsky', 'fresh', 'original', 'classic',
  'nefiltrovaný', 'nefiltrovany', 'filtrovaný', 'filtrovany',
  // Marketing words
  'dárkové', 'darkove', 'dárek', 'darek', 'gourmet', 'luxusní', 'luxusni',
  'edice', 'edition', 'limited', 'dětský', 'detsky', 'pro',
  // Cultivars (NE značky)
  'picual', 'arbequina', 'manaki', 'koroneiki', 'hojiblanca', 'cornicabra',
  'frantoio', 'leccino', 'coratina', 'kalamata', 'olivastra', 'taggiasca',
  'pendolino', 'moraiolo', 'agoureleo',
  // BIO/cert words
  'eco', 'demeter', 'pdo', 'pgi', 'igp', 'dop', 'cs-bio',
  // Volume / unit words
  'ml', 'l', 'kg', 'g', 'litr', 'litry', 'litrů', 'kus', 'kusů',
  // Property words
  'kyselost', 'acidita', 'baleni', 'balení', 'lahev', 'láhev',
  'čerstvý', 'cerstvy', 'karafa', 'design', 'plain',
  'farmářský', 'farmarsky', 'farmer', 'rodinný', 'rodinny',
  'plech', 'sklo', 'skleněný', 'sklenny', 'pet', 'plast', 'plastový', 'plastovy',
  'tin', 'glass', 'plastic',
  // Months (z dat sklizně)
  'leden', 'únor', 'unor', 'březen', 'brezen', 'duben', 'květen', 'kveten',
  'červen', 'cerven', 'červenec', 'cervenec', 'srpen', 'září', 'zari',
  'říjen', 'rijen', 'listopad', 'prosinec',
  'sklizeň', 'sklizen', 'harvest', 'early',
  // Filler
  'ze', 'od', 'with', 'partners',  // "partners" když nemáme "Gourmet Partners" multi-word match
])

// Detekce patterns: "8 × ...", "15 × ...", "3 × 5l ..." — celý leading "N × kvantita"
// se přeskočí jako balení, ne značka.
const PACKAGE_PREFIX = /^\d+\s*[×x]\s*(?:\d+(?:[,.]?\d+)?\s*(?:l|ml|g|kg)\s+)?/i

export function extractBrandSlug(name: string): string | null {
  let cleaned = name.trim()
  // Strip "8 × ", "15 × 500 ml " atd.
  cleaned = cleaned.replace(PACKAGE_PREFIX, '')
  const lower = cleaned.toLowerCase()

  for (const [pattern, slug] of MULTI_WORD_BRANDS) {
    if (lower.startsWith(pattern)) return slug
  }

  const words = lower.split(/\s+/)
  let idx = 0
  // Skip leading generic prefix words + numerické tokens (např. "100% italiano")
  while (idx < words.length - 1) {
    // Strip leading/trailing punctuation pro matching ("(kyselost" → "kyselost")
    const w = words[idx].replace(/^[(\[«„"'.,]+|[)\]»".,!?:;]+$/g, '')
    if (!w) { idx++; continue }
    if (GENERIC_PREFIXES.has(w)) { idx++; continue }
    if (/^\d+(?:[%×x][a-z]*)?$/i.test(w)) { idx++; continue }  // "100%", "8x", samotné číslo
    if (/^\d+(?:[,.]?\d+)?(?:ml|l|g|kg)$/i.test(w)) { idx++; continue }  // "750ml", "1l", "5l"
    if (/^[><=]\s*\d/.test(w)) { idx++; continue }  // "<0.3"
    // Update words[idx] to stripped version pro extrahování brandu
    words[idx] = w
    break
  }

  const brandWord = words[idx]
  if (!brandWord || brandWord.length < 2) return null
  // Slovo musí být alfanumerické (ne "—", "·", "&" atd.)
  if (!/[a-zřáčéíóúůěščžýňťď]/i.test(brandWord)) return null
  // Rejection list: pokud i po skipping zustane generic, vrátíme null
  if (GENERIC_PREFIXES.has(brandWord)) return null

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

/**
 * Fuzzy region detection z product name + raw description.
 * Použij pokud originRegion není explicitně zadán (XML feed obvykle nemá).
 *
 * Iteruje všechny region keys v REGION_MAP[countryCode] a zkouší je matchovat
 * jako substring v normalizovaném textu. Bere první match (REGION_MAP je
 * uspořádaný od specifičtějšího k obecnějšímu).
 *
 * Příklad:
 *   "Plakias - Premium BIO Extra panenský olivový olej 500 ml" + cc=GR
 *   → null (Plakias je vesnice na Krétě, ne mainstream region key)
 *   "Sitia P.D.O. Kréta Extra panenský 5 l" + cc=GR
 *   → "kreta" (matchne "kreta" / "kréta")
 */
export function extractRegionFromText(
  countryCode: string | null,
  text: string | null
): string | null {
  if (!countryCode || !text) return null
  const cc = countryCode.toLowerCase()
  const map = REGION_MAP[cc]
  if (!map) return null
  const normalized = normaliseRegionKey(text)
  // Iteruj všechny aliasy regionu — první substring match vyhrává.
  for (const [alias, slug] of Object.entries(map)) {
    if (normalized.includes(alias)) return slug
  }
  return null
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
