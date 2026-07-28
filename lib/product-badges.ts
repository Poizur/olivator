// Auto-vypočítané "superlativ" badge pro produktové karty na homepage.
// Každý olej dostane MAXIMÁLNĚ JEDEN badge — ten v čem mezi top 12 vyniká.
// Žádný ruční obsah, kompletně z dat. Mění se s každým novým crone během.

import type { Product, ProductOffer } from './types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

export type BadgeTone = 'gold' | 'olive' | 'terra' | 'amber' | 'sage'

export interface ProductBadge {
  label: string       // krátký text "Top score" / "Nejvíc polyfenolů"
  tone: BadgeTone
  hint?: string       // tooltip / accessibility text
}

/**
 * Vyhodnotí kandidáty na badge napříč seznamem a přidělí KAŽDÉMU oleji
 * jen ten badge, ve kterém je v setu unikátní vítěz.
 *
 * Pořadí priorit (vyhrává první match):
 *   1. Top Score (#1 absolutní)
 *   2. Nejvíc polyfenolů (≥600 mg/kg)
 *   3. Nejlepší cena/Score (score/100ml)
 *   4. BIO + nízká cena (cert + <30 Kč/100ml)
 *   5. Nejnižší kyselost (≤0.2%)
 *   6. Nejvýraznější (spicy+bitter ≥130)
 *   7. Nejjemnější (mild ≥70)
 *   8. Nová sklizeň (created_at < 14 dní)
 */
export function computeBadges(
  products: ProductWithOffer[]
): Map<string, ProductBadge> {
  const badges = new Map<string, ProductBadge>()
  if (products.length === 0) return badges

  // ─── Hlavní sólo vítězové ─────────────────────────────────────────
  // 1. Top Score (jen produkty se score; flavored přeskočíme)
  const scorable = products.filter((p) => p.type !== 'flavored' && p.olivatorScore != null && p.olivatorScore > 0)
  const topScore = [...scorable].sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))[0]
  if (topScore && topScore.olivatorScore != null && topScore.olivatorScore >= 70) {
    badges.set(topScore.id, {
      label: 'Top Score',
      tone: 'gold',
      hint: `Olej s nejvyšším Olivator Score (${topScore.olivatorScore}/100)`,
    })
  }

  // 2. Nejvíc polyfenolů — z těch které ještě nemají badge
  const withPoly = products
    .filter((p) => !badges.has(p.id) && p.polyphenols != null && p.polyphenols >= 600)
    .sort((a, b) => (b.polyphenols ?? 0) - (a.polyphenols ?? 0))
  if (withPoly[0]) {
    badges.set(withPoly[0].id, {
      label: 'Nejvíc polyfenolů',
      tone: 'olive',
      hint: `${withPoly[0].polyphenols} mg/kg — silné antioxidanty`,
    })
  }

  // 3. Nejlepší cena/Score — výhra pro budget choice (jen scorable)
  const bestValue = products
    .filter((p) => !badges.has(p.id) && p.cheapestOffer && p.volumeMl > 0 && p.olivatorScore != null && p.olivatorScore > 0)
    .map((p) => {
      const pricePer100 = (p.cheapestOffer!.price / p.volumeMl) * 100
      return { p, ratio: (p.olivatorScore ?? 0) / pricePer100 }
    })
    .sort((a, b) => b.ratio - a.ratio)[0]
  if (bestValue && bestValue.ratio > 0.5) {
    badges.set(bestValue.p.id, {
      label: 'Top cena/kvalita',
      tone: 'terra',
      hint: 'Nejlepší poměr Score k ceně za 100 ml',
    })
  }

  // 4. BIO + nízká cena
  const bioCheap = products.find((p) => {
    if (badges.has(p.id)) return false
    if (!p.certifications.some((c) => c === 'bio' || c === 'organic')) return false
    if (!p.cheapestOffer || p.volumeMl <= 0) return false
    const per100 = (p.cheapestOffer.price / p.volumeMl) * 100
    return per100 <= 50
  })
  if (bioCheap) {
    badges.set(bioCheap.id, {
      label: 'BIO za rozumnou cenu',
      tone: 'sage',
      hint: 'Certifikovaná bio kvalita pod 50 Kč/100 ml',
    })
  }

  // 5. Nejnižší kyselost (technická čistota)
  const lowestAcidity = products
    .filter((p) => !badges.has(p.id) && p.acidity != null && p.acidity <= 0.25)
    .sort((a, b) => (a.acidity ?? 1) - (b.acidity ?? 1))[0]
  if (lowestAcidity) {
    badges.set(lowestAcidity.id, {
      label: 'Nejčistší (kyselost)',
      tone: 'olive',
      hint: `Kyselost ${lowestAcidity.acidity} % — technická špička`,
    })
  }

  // 6. Nejvýraznější (palčivost + hořkost)
  const mostIntense = products
    .filter((p) => !badges.has(p.id))
    .map((p) => {
      const spicy = p.flavorProfile?.spicy ?? 0
      const bitter = p.flavorProfile?.bitter ?? 0
      return { p, intensity: spicy + bitter }
    })
    .sort((a, b) => b.intensity - a.intensity)[0]
  if (mostIntense && mostIntense.intensity >= 130) {
    badges.set(mostIntense.p.id, {
      label: 'Nejvýraznější',
      tone: 'amber',
      hint: 'Vysoká palčivost a hořkost — pro silnou kuchyni',
    })
  }

  // 7. Nejjemnější (mild)
  const mostMild = products
    .filter((p) => !badges.has(p.id))
    .sort((a, b) => (b.flavorProfile?.mild ?? 0) - (a.flavorProfile?.mild ?? 0))[0]
  if (mostMild && (mostMild.flavorProfile?.mild ?? 0) >= 70) {
    badges.set(mostMild.id, {
      label: 'Nejjemnější',
      tone: 'sage',
      hint: 'Vysoká jemnost — pro citlivou chuť',
    })
  }

  return badges
}

/**
 * Per-segment value badges — "★ Nejlepší hodnota do 200 Kč" atd.
 * Volá se server-side nad plným katalogem; vrací Map<productId, label>.
 *
 * Segmenty (nepřekrývají se — vítěz do 200 Kč nevyhraje do 300 Kč):
 *   do 200 Kč — nejlepší Score/price mezi produkty s nabídkou ≤ 200 Kč
 *   do 300 Kč — totéž pro 201–300 Kč (bez vítěze do 200)
 *   na vaření  — nejlepší Score z use_cases frying/cooking, aktivní nabídka
 */
export function computeSegmentValueBadges(
  products: ProductWithOffer[]
): Map<string, string> {
  const badges = new Map<string, string>()
  const claimed = new Set<string>()

  // Helper: best Score/price ratio in a price band
  function bestInBand(maxPrice: number, excludeIds: Set<string>): ProductWithOffer | null {
    return products
      .filter((p) => {
        if (excludeIds.has(p.id)) return false
        if (!p.cheapestOffer || p.cheapestOffer.price > maxPrice) return false
        if (!p.olivatorScore || p.olivatorScore <= 0) return false
        return true
      })
      .sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))[0] ?? null
  }

  const winner200 = bestInBand(200, claimed)
  if (winner200) {
    badges.set(winner200.id, '★ Nejlepší hodnota do 200 Kč')
    claimed.add(winner200.id)
  }

  const winner300 = bestInBand(300, claimed)
  if (winner300) {
    badges.set(winner300.id, '★ Nejlepší hodnota do 300 Kč')
    claimed.add(winner300.id)
  }

  // Na vaření — best Score among frying/cooking use_cases with active offer
  const cookingWinner = products
    .filter((p) => {
      if (claimed.has(p.id)) return false
      if (!p.cheapestOffer) return false
      if (!p.olivatorScore || p.olivatorScore <= 0) return false
      return p.useCases.some((u) => u === 'frying' || u === 'cooking')
    })
    .sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))[0] ?? null
  if (cookingWinner) {
    badges.set(cookingWinner.id, '★ Nejlepší na vaření')
    claimed.add(cookingWinner.id)
  }

  return badges
}

/**
 * Vybere TOP olej v dané chuťové kategorii pro homepage "Tipy" sekci.
 * Vrací top 1 podle hodnoty osy * Score (kvalita má vliv, ale ne dominantní).
 */
export function pickByCategory(
  products: ProductWithOffer[],
  category: 'vyrazny' | 'jemny' | 'zdravy'
): ProductWithOffer | null {
  const ranked = [...products]
    // Skip flavored — pickByCategory featuruje jen čistý EVOO podle chuti/zdraví
    .filter((p) => p.cheapestOffer != null && p.type !== 'flavored')
    .map((p) => {
      let categoryScore = 0
      if (category === 'vyrazny') {
        const spicy = p.flavorProfile?.spicy ?? 0
        const bitter = p.flavorProfile?.bitter ?? 0
        categoryScore = (spicy + bitter) / 2
      } else if (category === 'jemny') {
        categoryScore = p.flavorProfile?.mild ?? 0
      } else if (category === 'zdravy') {
        // Zdravý = nejvíc polyfenolů (antioxidanty)
        categoryScore = (p.polyphenols ?? 0) / 10  // normalizováno do 0-100ish
      }
      // Kombinujeme: 70 % chuť/zdraví, 30 % score (musí být i kvalitní)
      const combined = categoryScore * 0.7 + (p.olivatorScore ?? 0) * 0.3
      return { p, combined }
    })
    .sort((a, b) => b.combined - a.combined)

  return ranked[0]?.p ?? null
}
