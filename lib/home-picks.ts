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

/** YYYY-W## → integer hash. Stejný týden = stejný olej.
 *  Rotace 1×/týden místo denně. */
function weeklySeed(): number {
  const now = new Date()
  // ISO week number (1-53)
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  const key = `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Cena za 100 ml — pro value scoring. Null pokud nelze spočítat. */
function pricePer100ml(p: ProductWithOffer): number | null {
  if (!p.cheapestOffer || p.volumeMl <= 0) return null
  return (p.cheapestOffer.price / p.volumeMl) * 100
}

/** Olej týdne: nejlepší poměr Score/cena. Pool top 10, rotuje 1×/týden.
 *  Předtím se nazýval pickOilOfDay a rotoval denně — text "Olej měsíce"
 *  neseděl s realitou. Teď týden = stálé doporučení po celý týden. */
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
  return candidates[weeklySeed() % candidates.length]
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
