// Klasifikace intenzity chuti olivového oleje do tří kategorií.
// Primárně z flavor_profile (AI-vyplněno při rescrape), fallback z názvu produktu.
//
// Kategorie:
//   jemny   — mild ≥65, nebo mírné jemné chutě v názvu
//   pikantni — spicy ≥50 nebo bitter ≥60, nebo výrazné indikátory v názvu
//   stredni  — vše ostatní (výchozí)

import type { Product } from './types'

export type Intensity = 'jemny' | 'stredni' | 'pikantni'

const PIKANTNI_PATTERNS = [
  /\bpikantní\b/i,
  /\bvýrazn[ýéá]\b/i,
  /\brobustní\b/i,
  /\bintenzivní\b/i,
  /\bsilný\b/i,
  /\bpálivý\b/i,
  /\brobusto\b/i,
  /\bfruttato\s+(?:intenso|forte)\b/i,
]

const JEMNY_PATTERNS = [
  /\bjemn[ýéá]\b/i,
  /\blehk[ýéá]\b/i,
  /\bdelikátní\b/i,
  /\bmírn[ýéá]\b/i,
  /\bsubtilní\b/i,
  /\bdelicato\b/i,
  /\bfruttato\s+(?:leggero|delicato)\b/i,
]

export function classifyIntensity(product: Pick<Product, 'flavorProfile' | 'name'>): Intensity {
  const { spicy = 0, bitter = 0, mild = 0 } = product.flavorProfile ?? {}

  // Pokud AI vyplnila flavor_profile, použij ji jako autoritativní zdroj.
  const hasFlavorData = spicy > 0 || bitter > 0 || mild > 0
  if (hasFlavorData) {
    if (spicy >= 50 || bitter >= 60) return 'pikantni'
    if (mild >= 65) return 'jemny'
    return 'stredni'
  }

  // Fallback: keyword matching z názvu produktu.
  const name = product.name.toLowerCase()
  if (PIKANTNI_PATTERNS.some((re) => re.test(name))) return 'pikantni'
  if (JEMNY_PATTERNS.some((re) => re.test(name))) return 'jemny'
  return 'stredni'
}

export const INTENSITY_LABELS: Record<Intensity, string> = {
  jemny: 'Jemné',
  stredni: 'Střední',
  pikantni: 'Pikantní',
}

export const INTENSITY_DESCRIPTIONS: Record<Intensity, string> = {
  jemny: 'Ovocné, máselné, bez hořkosti. Ideální na saláty, ryby a dezerty.',
  stredni: 'Vyvážená hořkost a palčivost. Skvělé do kuchyně i na přímou konzumaci.',
  pikantni: 'Výrazná hořkost a palčivost. Pro gurmány a silné mediteránní pokrmy.',
}
