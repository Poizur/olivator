// Olivator Score calculation.
// Implements the weighting system from CLAUDE.md section 3:
//   Acidity       — 35 %
//   Certifications — 25 %
//   Polyphenols + quality — 25 %
//   Price / quality — 15 %
//
// Pure function. Safe to run on client or server.
//
// Změny 2026-05-07:
//   - flavored type → vrací null (aromatizovaný olej se nehodnotí EVOO škálou)
//   - proporcionální váhy: když chybí klíčová komponenta (acidity/polyphenols/
//     certifications), redistribuujeme váhu místo penalty 0/8 default
//   - práh 50 % váhy známých komponent — pod tím vrátíme null místo nesmyslu

export interface ScoreInput {
  acidity?: number | null              // in percent, e.g. 0.25
  certifications?: string[] | null     // ISO-like codes: dop, pgp, bio, organic, nyiooc, demeter
  polyphenols?: number | null          // mg/kg
  peroxideValue?: number | null        // peroxide index
  pricePer100ml?: number | null        // CZK per 100 ml (from cheapest offer)
  type?: string | null                 // 'evoo' | 'virgin' | 'refined' | 'olive_oil' | 'pomace' | 'flavored'
}

export interface ScoreResult {
  total: number
  breakdown: {
    acidity: number
    certifications: number
    quality: number
    value: number
  }
  /** True když nemáme dost dat pro férové score. UI by mělo zobrazit "připravujeme". */
  insufficientData?: boolean
  /** Které komponenty se podařilo spočítat (pro UI breakdown). */
  hasData?: {
    acidity: boolean
    certifications: boolean
    quality: boolean
    value: boolean
  }
}

/** 35 points max. Lower acidity = better. */
function calcAcidity(acidity: number): number {
  if (acidity <= 0.2) return 35
  if (acidity <= 0.4) {
    return Math.round(34 - ((acidity - 0.2) / 0.2) * 9)
  }
  if (acidity <= 0.8) {
    return Math.round(24 - ((acidity - 0.4) / 0.4) * 9)
  }
  return Math.max(0, Math.round(14 - ((acidity - 0.8) / 0.7) * 14))
}

/** 25 points max. DOP + BIO is the gold standard. */
function calcCertifications(certs: string[]): number {
  const has = (c: string) => certs.includes(c)

  const hasDOP = has('dop')
  const hasBIO = has('bio') || has('organic')
  const hasPGP = has('pgp')
  const hasNYIOOC = has('nyiooc')
  const hasDemeter = has('demeter')

  let score = 0
  if (hasDOP && hasBIO) score = 25
  else if (hasDOP) score = 20
  else if (hasBIO) score = 18
  else if (hasPGP) score = 15
  else if (hasNYIOOC) score = 15

  if (hasDemeter) score += 3
  if (hasNYIOOC && !(hasDOP || hasBIO || hasPGP)) {
    // already counted
  } else if (hasNYIOOC) {
    score += 2
  }

  return Math.max(0, Math.min(25, score))
}

/** 25 points max. Polyphenols primary, peroxide as quality penalty. */
function calcQuality(polyphenols: number, peroxide?: number | null): number {
  let score: number
  if (polyphenols >= 300) {
    score = 22 + Math.min(3, (polyphenols - 300) / 100)
  } else if (polyphenols >= 200) {
    score = 15 + ((polyphenols - 200) / 100) * 7
  } else if (polyphenols >= 100) {
    score = 8 + ((polyphenols - 100) / 100) * 7
  } else {
    score = (polyphenols / 100) * 8
  }

  if (peroxide != null && !isNaN(peroxide)) {
    if (peroxide > 15) score -= 3
    else if (peroxide > 10) score -= 1
  }

  return Math.max(0, Math.min(25, Math.round(score)))
}

/** 15 points max. Cheaper at same quality = better value. */
function calcValue(pricePer100ml: number): number {
  if (pricePer100ml <= 20) return 15
  if (pricePer100ml <= 30) return 12
  if (pricePer100ml <= 40) return 9
  if (pricePer100ml <= 55) return 5
  return 2
}

const WEIGHTS = { acidity: 35, certifications: 25, quality: 25, value: 15 } as const
const MIN_DATA_WEIGHT = 50  // potřebujeme pokrýt alespoň 50 % váhy, jinak insufficientData

/**
 * Vypočítá score s proporcionálními váhami.
 *
 * Pravidla:
 * - Pokud type='flavored' → vrátí null score (aromatizovaný olej nehodnotíme)
 * - Pro každou komponentu zjistíme zda máme data (ne null/NaN)
 * - Sečteme váhy KOMPONENT KTERÉ MÁME — to je `availableWeight`
 * - availableWeight < 50 → insufficientData (vrátíme breakdown ale total=0 a flag)
 * - jinak normalizujeme: total = round(sumOfPoints * 100 / availableWeight)
 *
 * Důvod: produkt bez polyfenolů nedostane "trest" 8/25 default. Místo toho se
 * jeho score počítá pouze z dat, která máme. Pokud máme jen cenu → 15 % váhy →
 * insufficient (nesmysl hodnotit olej jen podle ceny).
 */
export function calculateScore(input: ScoreInput): ScoreResult {
  // Aromatizované oleje se nehodnotí EVOO škálou
  if (input.type === 'flavored') {
    return {
      total: 0,
      breakdown: { acidity: 0, certifications: 0, quality: 0, value: 0 },
      insufficientData: true,
      hasData: { acidity: false, certifications: false, quality: false, value: false },
    }
  }

  const hasAcid = input.acidity != null && !isNaN(input.acidity)
  const hasCert = input.certifications != null && input.certifications.length > 0
  const hasPoly = input.polyphenols != null && !isNaN(input.polyphenols)
  const hasPrice = input.pricePer100ml != null && !isNaN(input.pricePer100ml)

  const acidityPts = hasAcid ? calcAcidity(input.acidity!) : 0
  const certPts = hasCert ? calcCertifications(input.certifications!) : 0
  const qualityPts = hasPoly ? calcQuality(input.polyphenols!, input.peroxideValue) : 0
  const valuePts = hasPrice ? calcValue(input.pricePer100ml!) : 0

  const availableWeight =
    (hasAcid ? WEIGHTS.acidity : 0) +
    (hasCert ? WEIGHTS.certifications : 0) +
    (hasPoly ? WEIGHTS.quality : 0) +
    (hasPrice ? WEIGHTS.value : 0)

  const breakdown = { acidity: acidityPts, certifications: certPts, quality: qualityPts, value: valuePts }
  const hasData = { acidity: hasAcid, certifications: hasCert, quality: hasPoly, value: hasPrice }

  if (availableWeight < MIN_DATA_WEIGHT) {
    return {
      total: 0,
      breakdown,
      insufficientData: true,
      hasData,
    }
  }

  const sumPoints = acidityPts + certPts + qualityPts + valuePts
  // Normalizujeme na 100 — když máme 60% váhu a 30 b., výsledek je 50/100
  const total = Math.max(0, Math.min(100, Math.round((sumPoints / availableWeight) * 100)))

  return { total, breakdown, hasData }
}
