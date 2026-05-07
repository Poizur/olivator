export function formatPrice(price: number): string {
  return `${Math.round(price)} Kč`
}

export function formatPricePer100ml(price: number, volumeMl: number): string {
  const per100 = (price / volumeMl) * 100
  return `${Math.round(per100)} Kč / 100 ml`
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
  }
  return flags[code] || code
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
const MULTI_WORD_BRANDS: readonly string[] = [
  'Terra Creta',
  'Frantoio Franci',
  'Olival Selection',
]

export function extractBrand(name: string): string {
  for (const brand of MULTI_WORD_BRANDS) {
    if (name.startsWith(brand)) return brand
  }
  return name.split(/\s+/)[0] ?? name
}
