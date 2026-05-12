// Pevná mezera (NBSP, U+00A0) jako oddělovač tisíců — drží číslo + jednotku
// pohromadě v textu, neporušuje řádkování (ČSN 01 6910 typografie).
export function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

export function formatPricePer100ml(price: number, volumeMl: number): string {
  const per100 = (price / volumeMl) * 100
  return `${Math.round(per100).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč / 100 ml`
}

// České skloňování regionů do genitivu pro nadpisy ("Další oleje X z Y").
// Pokrývá nejčastější olive regiony — fallback vrací jméno beze změny
// (lepší než hrubý suffix-add, který by mohl zkomolit edge cases).
const REGION_GENITIVE: Record<string, string> = {
  'Peloponés': 'Peloponésu',
  'Kréta': 'Kréty',
  'Sitia': 'Sitie',
  'Sitia Lassithi': 'Sitie Lassithi',
  'Lesbos': 'Lesbu',
  'Kalamata': 'Kalamaty',
  'Kalamatá': 'Kalamaty',
  'Korfu': 'Korfu',
  'Mesinia': 'Mesinie',
  'Chania': 'Chanie',
  'Toskánsko': 'Toskánska',
  'Sicílie': 'Sicílie',
  'Apulie': 'Apulie',
  'Umbrie': 'Umbrie',
  'Kalábrie': 'Kalábrie',
  'Garda': 'Gardy',
  'Liguria': 'Ligurie',
  'Lazio': 'Lazia',
  'Sardinie': 'Sardinie',
  'Kampánie': 'Kampánie',
  'Andalusie': 'Andalusie',
  'Jaén': 'Jaénu',
  'Jaen': 'Jaenu',
  'Katalánsko': 'Katalánska',
  'Aragon': 'Aragonu',
  'Extremadura': 'Extremadury',
  'Mallorca': 'Mallorky',
  'Cordoba': 'Cordoby',
  'Granada': 'Granady',
  'Istrie': 'Istrie',
  'Dalmácie': 'Dalmácie',
  'Brač': 'Brače',
  'Hvar': 'Hvaru',
  'Alentejo': 'Alenteja',
  'Douro': 'Doura',
}

export function regionGenitive(region: string): string {
  return REGION_GENITIVE[region] ?? region
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getScoreColor(score: number): string {
  if (score >= 87) return 'text-green-600'
  if (score >= 75) return 'text-amber-600'
  return 'text-blue-600'
}

export function getScoreBarColor(score: number): string {
  if (score >= 87) return 'bg-green-500'
  if (score >= 75) return 'bg-amber-500'
  return 'bg-blue-500'
}

export function countryFlag(code: string): string {
  const flags: Record<string, string> = {
    GR: '\u{1F1EC}\u{1F1F7}',
    IT: '\u{1F1EE}\u{1F1F9}',
    ES: '\u{1F1EA}\u{1F1F8}',
    HR: '\u{1F1ED}\u{1F1F7}',
    PT: '\u{1F1F5}\u{1F1F9}',
    TR: '\u{1F1F9}\u{1F1F7}',
    MA: '\u{1F1F2}\u{1F1E6}',
    TN: '\u{1F1F9}\u{1F1F3}',
    IL: '\u{1F1EE}\u{1F1F1}',
    US: '\u{1F1FA}\u{1F1F8}',
    CZ: '\u{1F1E8}\u{1F1FF}',
    EU: '\u{1F1EA}\u{1F1FA}',
  }
  return flags[code] || ''
}

export function countryName(code: string): string {
  const names: Record<string, string> = {
    GR: 'Řecko',
    IT: 'Itálie',
    ES: 'Španělsko',
    HR: 'Chorvatsko',
    PT: 'Portugalsko',
    TR: 'Turecko',
  }
  return names[code] || code
}

/** Infers ISO-2 origin country from free text (product name, description, params).
 *  Used by both the Playwright scraper and the Heureka feed sync so the logic
 *  is consistent and maintained in one place.
 *  Returns null when nothing matches — caller should fall back to retailer default or admin. */
export function inferOriginFromText(text: string): { country: string | null; region: string | null } {
  const t = text.toLowerCase()
  const patterns: Array<{ re: RegExp; country: string; region?: string }> = [
    // --- GREECE ---
    { re: /\bkorfu\b|\bcorfu\b/, country: 'GR', region: 'Korfu' },
    { re: /\bkr[eé]ta\b|\bcret[ea]\b|\bkrétsk/, country: 'GR', region: 'Kréta' },
    { re: /\bsitia\b/, country: 'GR', region: 'Kréta' },
    { re: /\blesbos\b|\blesvos\b|\bmytilini\b/, country: 'GR', region: 'Lesbos' },
    { re: /\bpelopon\w*/, country: 'GR', region: 'Peloponés' },
    { re: /\bkalamat\w*/, country: 'GR', region: 'Kalamata' },
    { re: /\blasithi\b|\blaconi\b|\bsparta\b|\bspartansk/, country: 'GR', region: 'Peloponés' },
    { re: /\bmessin\w*|\bkalamata\b/, country: 'GR', region: 'Messinia' },
    { re: /\bthessaly\b|\bthessali/, country: 'GR', region: 'Thessálie' },
    { re: /\brhodes\b|\brodos\b|\brh[oó]dos\b/, country: 'GR', region: 'Rhodos' },
    { re: /\br[eé]ck[oyá]|\bgreek\b|\bgreece\b|\b[řr][eé]cko\b/, country: 'GR' },
    // Greek brand/producer names (high-confidence)
    { re: /\bliophos\b|\bstamatakos\b|\bgaea\b|\bminoan\b|\belaion\b|\bkallisti\b|\bproteas\b/, country: 'GR' },
    { re: /\biliada\b|\bcolymvari\b|\bkoronea\b|\bpelion\b|\bnixe\b/, country: 'GR' },

    // --- ITALY ---
    { re: /\btoskán\w*|\btuscan\w*/, country: 'IT', region: 'Toskánsko' },
    { re: /\bsic[íi]li\w*|\bsicil\w*/, country: 'IT', region: 'Sicílie' },
    { re: /\bapulie\b|\bapulia\b|\bpuglia\b/, country: 'IT', region: 'Apulie' },
    { re: /\bkalabrisk\w*|\bcalabrisk\w*|\bcalabia/, country: 'IT', region: 'Kalábrie' },
    { re: /\bligurie\b|\bliguria\b|\briviera\b/, country: 'IT', region: 'Ligurie' },
    { re: /\bumbrie\b|\bumbria\b/, country: 'IT', region: 'Umbrie' },
    { re: /\bkampáni\w*|\bcampania\b/, country: 'IT', region: 'Kampánie' },
    { re: /\bital\w*|\bitaly\b|\bitalian\b/, country: 'IT' },
    // Italian brand/producer names
    { re: /\bfrantoi\b|\bcutrera\b|\bmonini\b|\bfilippo berio\b|\bcarapelli\b|\bbertoli\b/, country: 'IT' },
    { re: /\bcasas de hualdo\b|\bbertoli\b|\bsabatino\b|\bfumo\b|\bbartolini\b/, country: 'IT' },

    // --- SPAIN ---
    { re: /\bandalus\w*/, country: 'ES', region: 'Andalusie' },
    { re: /\bc[oó]rdob\w*/, country: 'ES', region: 'Córdoba' },
    { re: /\bjaén\b|\bjaen\b/, country: 'ES', region: 'Jaén' },
    { re: /\bkataláns\w*|\bcataloñ\w*|\bcatalan\b/, country: 'ES', region: 'Katalánsko' },
    { re: /\bšpan[eě]l\w*|\bspain\b|\bspanish\b|\bespañ\w*/, country: 'ES' },
    // Spanish brand/producer names
    { re: /\bborges\b|\bla espa[nñ]ola\b|\bcortijo\b|\bcastillo\b|\bdeseo\b/, country: 'ES' },

    // --- CROATIA ---
    { re: /\bistri\w*/, country: 'HR', region: 'Istrie' },
    { re: /\bdalmáci\w*|\bdalmaci\w*/, country: 'HR', region: 'Dalmácie' },
    { re: /\bchorvat\w*|\bcroati\w*|\bcroatian\b/, country: 'HR' },

    // --- PORTUGAL ---
    { re: /\bportug\w*/, country: 'PT' },
    { re: /\balentek\w*|\balentejo\b/, country: 'PT', region: 'Alentejo' },

    // --- TURKEY ---
    { re: /\btureck\w*|\bturkish\b|\bturkiye\b|\bturkey\b/, country: 'TR' },

    // --- MOROCCO ---
    { re: /\bmaroc\w*|\bmorocc\w*/, country: 'MA' },

    // --- TUNISIA ---
    { re: /\btunis\w*/, country: 'TN' },

    // --- ISRAEL ---
    { re: /\bisrael\b|\bisraeli\b|\bisra[eé]l/, country: 'IL' },
  ]
  for (const p of patterns) {
    if (p.re.test(t)) return { country: p.country, region: p.region ?? null }
  }
  return { country: null, region: null }
}

/** Extracts ISO-2 country from Heureka PARAM map (e.g. "Země původu" → "Řecko" → "GR"). */
export function extractOriginFromParams(params: Record<string, string>): string | null {
  const COUNTRY_MAP: Record<string, string> = {
    'řecko': 'GR', 'greece': 'GR', 'greek': 'GR',
    'itálie': 'IT', 'italy': 'IT', 'italian': 'IT', 'italie': 'IT',
    'španělsko': 'ES', 'spain': 'ES', 'spanish': 'ES',
    'chorvatsko': 'HR', 'croatia': 'HR',
    'portugalsko': 'PT', 'portugal': 'PT',
    'turecko': 'TR', 'turkey': 'TR', 'türkiye': 'TR',
    'maroko': 'MA', 'morocco': 'MA',
    'tunisko': 'TN', 'tunisia': 'TN',
    'izrael': 'IL', 'israel': 'IL',
  }
  const PARAM_KEYS = ['Země původu', 'Původ', 'Country of Origin', 'Stát původu', 'Origine', 'Původ zboží', 'Stát']
  for (const key of PARAM_KEYS) {
    const val = params[key]
    if (val) {
      const iso = COUNTRY_MAP[val.toLowerCase().trim()]
      if (iso) return iso
    }
  }
  return null
}

export function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    evoo: 'Extra panenský',
    virgin: 'Panenský',
    refined: 'Rafinovaný',
    olive_oil: 'Olivový olej',
    pomace: 'Pokrutinový',
    flavored: 'Aromatizovaný',
  }
  return labels[type] || type
}

export function useCaseLabel(use: string): string {
  const labels: Record<string, string> = {
    salad: 'salát',
    cooking: 'vaření',
    frying: 'smažení',
    dipping: 'dipping',
    fish: 'ryby',
    meat: 'maso',
    health: 'zdraví',
    gift: 'dárek',
  }
  return labels[use] || use
}

export function certLabel(cert: string): string {
  const labels: Record<string, string> = {
    dop: 'DOP',
    pgp: 'PGP',
    bio: 'BIO',
    organic: 'Organic',
    nyiooc: 'NYIOOC',
  }
  return labels[cert] || cert.toUpperCase()
}

// Extract brand from product name. Most olive oil brands are 1-2 words at
// the start of the product name (Gaea Fresh, Terra Creta Estate, etc).
// Known multi-word brands are hardcoded; everything else falls back to
// first word.
// Display label pro značku z product name. Pouzite v admin tabulce
// (column Výrobce) — sdílí logiku s extractBrandSlug ale vraci capitalized
// human-readable label místo slugu.
//
// User feedback 2026-05-07: predtim "first word" extraction produkovalo
// falesne "značky" jako Extra (16), Picual (11), Dárkové (1) atd.
// Nyni reuses extractBrandSlug logiku ktera skipuje generic prefixy + cultivars.
export function extractBrand(name: string): string {
  // Reuse extraction logic from entity-extractor — synchronizovano via slug
  // (brand_slug v DB je kanonicky zdroj pravdy). Tady jen pretlumocime.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { extractBrandSlug } = require('./entity-extractor') as typeof import('./entity-extractor')
  const slug: string | null = extractBrandSlug(name)
  if (!slug) return '—'
  // Capitalize prvni pismeno + replace dashes na space
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
}
