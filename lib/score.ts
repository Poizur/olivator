// Olivator Score calculation.
// Implements the weighting system from CLAUDE.md section 3:
//   Acidity       — 35 %
//   Certifications — 25 %
//   Polyphenols + quality — 25 %
//   Price / quality — 15 %
//
// Pure function. Safe to run on client or server.

export interface ScoreInput {
  acidity?: number | null              // in percent, e.g. 0.25
  certifications?: string[] | null     // ISO-like codes: dop, pgp, bio, organic, nyiooc, demeter
  polyphenols?: number | null          // mg/kg
  peroxideValue?: number | null        // peroxide index
  pricePer100ml?: number | null        // CZK per 100 ml (from cheapest offer)
}

export interface ScoreResult {
  total: number
  breakdown: {
    acidity: number
    certifications: number
    quality: number
    value: number
  }
}

/** 35 points max. Lower acidity = better. */
function calcAcidity(acidity?: number | null): number {
  if (acidity == null || isNaN(acidity)) return 0
  if (acidity <= 0.2) return 35
  if (acidity <= 0.4) {
    // linear from 34 (at 0.2) to 25 (at 0.4)
    return Math.round(34 - ((acidity - 0.2) / 0.2) * 9)
  }
  if (acidity <= 0.8) {
    // linear from 24 (at 0.4) to 15 (at 0.8)
    return Math.round(24 - ((acidity - 0.4) / 0.4) * 9)
  }
  // above 0.8%: scale down
  return Math.max(0, Math.round(14 - ((acidity - 0.8) / 0.7) * 14))
}

/** 25 points max. DOP + BIO is the gold standard. */
function calcCertifications(certs?: string[] | null): number {
  if (!certs || certs.length === 0) return 0
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

  // Additive bonuses for extras beyond the main tier
  if (hasDemeter) score += 3
  if (hasNYIOOC && !(hasDOP || hasBIO || hasPGP)) {
    // already counted — skip
  } else if (hasNYIOOC) {
    score += 2
  }

  return Math.max(0, Math.min(25, score))
}

/** 25 points max. Polyphenols primary, peroxide as quality penalty. */
function calcQuality(polyphenols?: number | null, peroxide?: number | null): number {
  let score: number
  if (polyphenols == null || isNaN(polyphenols)) {
    score = 8 // unknown → median
  } else if (polyphenols >= 300) {
    // 22 base + up to 3 for very high
    score = 22 + Math.min(3, (polyphenols - 300) / 100)
  } else if (polyphenols >= 200) {
    // 15–22
    score = 15 + ((polyphenols - 200) / 100) * 7
  } else if (polyphenols >= 100) {
    // 8–15
    score = 8 + ((polyphenols - 100) / 100) * 7
  } else {
    // 0–8
    score = (polyphenols / 100) * 8
  }

  // Peroxide value: lower = fresher. Penalty if high.
  if (peroxide != null && !isNaN(peroxide)) {
    if (peroxide > 15) score -= 3
    else if (peroxide > 10) score -= 1
  }

  return Math.max(0, Math.min(25, Math.round(score)))
}

/** 15 points max. Cheaper at same quality = better value. */
function calcValue(pricePer100ml?: number | null): number {
  if (pricePer100ml == null || isNaN(pricePer100ml)) return 8
  if (pricePer100ml <= 20) return 15
  if (pricePer100ml <= 30) return 12
  if (pricePer100ml <= 40) return 9
  if (pricePer100ml <= 55) return 5
  return 2
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const acidity = calcAcidity(input.acidity)
  const certifications = calcCertifications(input.certifications)
  const quality = calcQuality(input.polyphenols, input.peroxideValue)
  const value = calcValue(input.pricePer100ml)
  const total = Math.max(0, Math.min(100, acidity + certifications + quality + value))
  return {
    total,
    breakdown: { acidity, certifications, quality, value },
  }
}
