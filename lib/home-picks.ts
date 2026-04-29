// Daily-rotated product selections for homepage.
//
// Vše je deterministické — stejný den dá stejný výběr (cache-friendly,
// SSR stabilní), další den se rotuje. Filtry zaručují kvalitu kandidátů,
// pak modulo dnešního dne pick jeden.

import type { Product, ProductOffer } from './types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

/** YYYY-MM-DD → integer hash. Stejný den = stejný výsledek. */
function dailySeed(): number {
  const today = new Date().toISOString().slice(0, 10) // 2026-04-29
  let h = 0
  for (let i = 0; i < today.length; i++) {
    h = ((h << 5) - h + today.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Cena za 100 ml — pro value scoring. Null pokud nelze spočítat. */
function pricePer100ml(p: ProductWithOffer): number | null {
  if (!p.cheapestOffer || p.volumeMl <= 0) return null
  return (p.cheapestOffer.price / p.volumeMl) * 100
}

/** Olej dne: nejlepší poměr Score/cena. Pool top 10, denně rotuje. */
export function pickOilOfDay(all: ProductWithOffer[]): ProductWithOffer | null {
  const candidates = all
    .filter((p) => p.olivatorScore >= 60 && p.cheapestOffer != null && p.volumeMl > 0)
    .map((p) => {
      const ppm = pricePer100ml(p)!
      // value = score / log(price per 100ml). Vyšší = lepší.
      const value = p.olivatorScore / Math.log(Math.max(ppm, 10))
      return { p, value }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((x) => x.p)

  if (candidates.length === 0) return null
  return candidates[dailySeed() % candidates.length]
}

/** Extract brand prefix z názvu (první 2 slova) pro diverzifikaci výběru. */
function brandKey(p: ProductWithOffer): string {
  return p.name.split(/\s+/).slice(0, 2).join(' ').toLowerCase()
}

/** 3 kurátorovaná doporučení — pro zdraví, vaření, dárek.
 *  Diverzifikace: nikdy stejný produkt, pokud možno ani stejná značka. */
export function pickThreeCurated(all: ProductWithOffer[]): {
  health: ProductWithOffer | null
  cooking: ProductWithOffer | null
  gift: ProductWithOffer | null
} {
  const seed = dailySeed()
  const usedIds = new Set<string>()
  const usedBrands = new Set<string>()

  function pick(pool: ProductWithOffer[]): ProductWithOffer | null {
    if (pool.length === 0) return null
    // Preferuj produkty s ne-použitou značkou; fallback na cokoli unikátního
    const unbrandedPool = pool.filter((p) => !usedBrands.has(brandKey(p)) && !usedIds.has(p.id))
    const fallbackPool = pool.filter((p) => !usedIds.has(p.id))
    const finalPool = unbrandedPool.length > 0 ? unbrandedPool : fallbackPool
    if (finalPool.length === 0) return null
    const chosen = finalPool[seed % finalPool.length]
    usedIds.add(chosen.id)
    usedBrands.add(brandKey(chosen))
    return chosen
  }

  // Pro zdraví: nejvíc polyfenolů (≥500 mg/kg = EU health claim 2x). Top 6.
  const healthPool = all
    .filter((p) => (p.polyphenols ?? 0) >= 500 && p.cheapestOffer != null)
    .sort((a, b) => (b.polyphenols ?? 0) - (a.polyphenols ?? 0))
    .slice(0, 6)
  const health = pick(healthPool)

  // Pro vaření: nízká kyselost (<0.4%), score 60+. Top 6.
  const cookingPool = all
    .filter((p) => {
      const ac = p.acidity
      return ac != null && ac < 0.4 && p.olivatorScore >= 60 && p.cheapestOffer != null
    })
    .sort((a, b) => b.olivatorScore - a.olivatorScore)
    .slice(0, 6)
  const cooking = pick(cookingPool)

  // Pro dárek: vysoké Score + bonus za DOP/BIO. Top 6.
  const giftPool = all
    .filter((p) => p.olivatorScore >= 70 && p.cheapestOffer != null)
    .sort((a, b) => {
      const certBonusA = a.certifications.includes('dop') ? 5 : (a.certifications.includes('bio') ? 3 : 0)
      const certBonusB = b.certifications.includes('dop') ? 5 : (b.certifications.includes('bio') ? 3 : 0)
      return (b.olivatorScore + certBonusB) - (a.olivatorScore + certBonusA)
    })
    .slice(0, 6)
  const gift = pick(giftPool)

  return { health, cooking, gift }
}

/** Featured pro Score explainer: produkt který má kompletní breakdown. */
export function pickScoreFeature(all: ProductWithOffer[]): ProductWithOffer | null {
  const candidates = all
    .filter((p) => {
      if (p.olivatorScore < 65) return false
      if (p.cheapestOffer == null) return false
      const sb = p.scoreBreakdown
      // Potřebujeme všechny 4 komponenty pro vizuální breakdown
      if (!sb || typeof sb.acidity !== 'number') return false
      return true
    })
    .sort((a, b) => b.olivatorScore - a.olivatorScore)
    .slice(0, 8)

  if (candidates.length === 0) return null
  return candidates[dailySeed() % candidates.length]
}
