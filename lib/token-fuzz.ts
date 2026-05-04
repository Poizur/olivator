// Token-set ratio fuzzy match — TS port z Python rapidfuzz.fuzz.token_set_ratio.
// Používá Learning Agent pro stage 1 dedup learnings.
//
// Algoritmus:
//   1. Tokenize obě stringy (lowercase, alphanumeric)
//   2. Spočítej intersection + symmetric_difference
//   3. Vrať score 0-100 = 100 * (intersection_size + len_of_unique_tokens) / total
//
// Approximation rapidfuzz behavior — pro Olivator dedup pipeline stačí.

const TOKEN_RX = /[a-zA-Z0-9čšřžýáíéúůďťňó]+/gi

function tokenize(s: string): string[] {
  if (!s) return []
  const matches = s.toLowerCase().match(TOKEN_RX)
  return matches ?? []
}

/** Token-set ratio 0-100 — vyšší = podobnější.
 *  Implementace blízká rapidfuzz.fuzz.token_set_ratio. */
export function tokenSetRatio(a: string, b: string): number {
  const ta = new Set(tokenize(a))
  const tb = new Set(tokenize(b))
  if (ta.size === 0 && tb.size === 0) return 100
  if (ta.size === 0 || tb.size === 0) return 0

  const intersection = new Set<string>()
  for (const t of ta) if (tb.has(t)) intersection.add(t)
  const interSize = intersection.size

  const onlyA = ta.size - interSize
  const onlyB = tb.size - interSize

  // Token set ratio: best of three sequence comparisons (intersection,
  // intersection+only-in-A, intersection+only-in-B). Approximation:
  // score = 2*intersection / (2*intersection + onlyA + onlyB) * 100
  const denom = 2 * interSize + onlyA + onlyB
  if (denom === 0) return 0
  return Math.round((2 * interSize / denom) * 100)
}
