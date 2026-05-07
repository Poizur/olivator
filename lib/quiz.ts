// Quiz "Najdi svůj olej" — pravidlový recommendation engine.
// 5 otázek → score napříč produkty → top 3 doporučení.
// Pro Phase 2 lze nahradit AI variant (Claude) která vezme answers + product list.

import type { Product, ProductOffer } from './types'

export type AnswerKey =
  | 'use_case'
  | 'price_range'
  | 'taste_intensity'
  | 'certifications_pref'
  | 'volume_pref'

export interface QuizQuestion {
  key: AnswerKey
  question: string
  helpText?: string
  options: Array<{ value: string; label: string; emoji?: string }>
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'use_case',
    question: 'Na co chceš olej hlavně používat?',
    helpText: 'Jiný styl sedne na saláty, jiný na vaření.',
    options: [
      { value: 'salad', label: 'Saláty, dipping, polévání', emoji: '🥗' },
      { value: 'cooking', label: 'Vaření, smažení, pečení', emoji: '🍳' },
      { value: 'health', label: 'Lžička denně pro zdraví', emoji: '💚' },
      { value: 'gift', label: 'Dárek (pro náročného)', emoji: '🎁' },
      { value: 'allround', label: 'Univerzální, nemám preferenci', emoji: '🫒' },
    ],
  },
  {
    key: 'price_range',
    question: 'Kolik si připlatíš za kvalitu?',
    helpText: 'Cena za 100 ml pomáhá srovnávat napříč objemy.',
    options: [
      { value: 'budget', label: 'Do 30 Kč / 100 ml — co nejlevněji', emoji: '💰' },
      { value: 'mid', label: '30–60 Kč / 100 ml — slušná střední', emoji: '🟢' },
      { value: 'premium', label: '60–120 Kč / 100 ml — premium kvalita', emoji: '⭐' },
      { value: 'luxury', label: 'Nad 120 Kč / 100 ml — top specialty', emoji: '💎' },
    ],
  },
  {
    key: 'taste_intensity',
    question: 'Jakou chuť preferuješ?',
    helpText: 'Pálivý olej = víc polyfenolů = víc zdraví, ale ne každému chutná.',
    options: [
      { value: 'mild', label: 'Jemný a krémový — bez hořkosti', emoji: '🍶' },
      { value: 'medium', label: 'Vyvážený — trochu pálivý, trochu jemný', emoji: '⚖️' },
      { value: 'intense', label: 'Pálivý a hořký — výrazná chuť, max polyfenoly', emoji: '🔥' },
    ],
  },
  {
    key: 'certifications_pref',
    question: 'Záleží ti na certifikaci?',
    helpText: 'BIO = bez pesticidů. DOP = chráněný region původu (např. Kalamata).',
    options: [
      { value: 'bio', label: 'Ano, BIO / Organic', emoji: '🌿' },
      { value: 'dop', label: 'Ano, DOP / chráněný region', emoji: '🏛️' },
      { value: 'any', label: 'Není priorita', emoji: '🤷' },
    ],
  },
  {
    key: 'volume_pref',
    question: 'Jaký objem ti vyhovuje?',
    helpText: 'Větší balení = lepší cena za 100 ml. Menší = čerstvější po otevření.',
    options: [
      { value: 'small', label: 'Malé (250–500 ml) — chci čerstvost', emoji: '🥃' },
      { value: 'medium', label: 'Střední (1 l)', emoji: '🍾' },
      { value: 'large', label: 'Velké (3 l a víc) — domácnost více konzumuje', emoji: '🛢️' },
    ],
  },
]

export type QuizAnswers = Partial<Record<AnswerKey, string>>

interface ScoredProduct {
  product: Product
  score: number
  reasons: string[]
}

/** Spočítá similarity score produktu vůči odpovědím. Vyšší = lepší match. */
export function scoreProductForAnswers(
  p: Product & { cheapestOffer: ProductOffer | null },
  answers: QuizAnswers
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // 1) Use case
  const uc = answers.use_case
  if (uc) {
    if (uc === 'salad' && (p.flavorProfile?.fruity ?? 0) > 50) {
      score += 15
      reasons.push('Ovocné tóny — sedí na saláty a dipping')
    }
    if (uc === 'cooking' && (p.flavorProfile?.bitter ?? 0) < 50 && p.acidity != null && p.acidity < 0.5) {
      score += 15
      reasons.push('Nízká kyselost a jemný profil — stabilní při tepelné úpravě')
    }
    if (uc === 'health' && p.polyphenols != null && p.polyphenols >= 500) {
      score += 25
      reasons.push(`${p.polyphenols} mg/kg polyfenolů — funkční elixír`)
    }
    if (uc === 'health' && p.polyphenols != null && p.polyphenols >= 250 && p.polyphenols < 500) {
      score += 12
      reasons.push(`${p.polyphenols} mg/kg polyfenolů — splňuje EU Health Claim`)
    }
    if (uc === 'gift' && p.olivatorScore != null && p.olivatorScore >= 75) {
      score += 18
      reasons.push(`Score ${p.olivatorScore}/100 — důstojný dárek`)
    }
    if (uc === 'gift' && p.certifications.includes('dop')) {
      score += 7
      reasons.push('DOP certifikace — chráněný region')
    }
    if (uc === 'allround') {
      // No specific bonus, neutral
      score += 5
    }
  }

  // 2) Price range — cena per 100 ml
  const pr = answers.price_range
  if (pr && p.cheapestOffer && p.volumeMl > 0) {
    const per100 = (p.cheapestOffer.price / p.volumeMl) * 100
    const ranges: Record<string, [number, number]> = {
      budget: [0, 30],
      mid: [30, 60],
      premium: [60, 120],
      luxury: [120, 9999],
    }
    const range = ranges[pr]
    if (range && per100 >= range[0] && per100 <= range[1]) {
      score += 20
      reasons.push(`${Math.round(per100)} Kč / 100 ml — odpovídá tvému rozpočtu`)
    } else if (range) {
      // Penalize being WAY off
      const distance = Math.min(
        Math.abs(per100 - range[0]),
        Math.abs(per100 - range[1])
      )
      if (distance > 30) score -= 10
    }
  }

  // 3) Taste intensity → flavor_profile.bitter
  const ti = answers.taste_intensity
  if (ti && p.flavorProfile) {
    const bitter = p.flavorProfile.bitter ?? 50
    if (ti === 'mild' && bitter <= 35) {
      score += 18
      reasons.push('Jemná chuť bez hořkosti')
    }
    if (ti === 'medium' && bitter > 35 && bitter <= 65) {
      score += 18
      reasons.push('Vyvážená chuť')
    }
    if (ti === 'intense' && bitter > 65) {
      score += 22
      reasons.push('Pálivý a výrazný — typické pro high-polyphenol')
    }
  }

  // 4) Certifications
  const cp = answers.certifications_pref
  if (cp === 'bio' && (p.certifications.includes('bio') || p.certifications.includes('organic'))) {
    score += 20
    reasons.push('BIO certifikace ✓')
  }
  if (cp === 'dop' && p.certifications.includes('dop')) {
    score += 20
    reasons.push('DOP certifikace ✓')
  }
  if (cp === 'any') {
    score += 3 // small bonus pokud má cokoli
    if (p.certifications.length > 0) score += 5
  }

  // 5) Volume
  const vp = answers.volume_pref
  if (vp && p.volumeMl > 0) {
    if (vp === 'small' && p.volumeMl <= 500) {
      score += 12
      reasons.push(`${p.volumeMl} ml — menší pro čerstvost`)
    }
    if (vp === 'medium' && p.volumeMl > 500 && p.volumeMl <= 1000) {
      score += 12
      reasons.push(`${p.volumeMl} ml — střední domácí balení`)
    }
    if (vp === 'large' && p.volumeMl > 1000) {
      score += 12
      reasons.push(`${p.volumeMl >= 1000 ? p.volumeMl / 1000 + ' l' : p.volumeMl + ' ml'} — velké balení`)
    }
  }

  // Olivator Score je univerzální tiebreaker — bonus za top score
  score += (p.olivatorScore ?? 0) / 10

  return { score, reasons }
}

/** Najde top 3 produkty pro dané answers. */
export function findRecommendations(
  products: Array<Product & { cheapestOffer: ProductOffer | null }>,
  answers: QuizAnswers
): ScoredProduct[] {
  const scored = products
    // Skip flavored a produkty bez Score — quiz doporučuje jen čistý EVOO
    .filter((p) => p.type !== 'flavored' && p.olivatorScore != null && p.olivatorScore > 0)
    .map((p) => {
      const result = scoreProductForAnswers(p, answers)
      return { product: p, ...result }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  return scored
}
