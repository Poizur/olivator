/**
 * Diversity-aware product selection.
 *
 * Problém: top N dle Score vrací 5× stejná značka (Lozano Picual má 6 variant
 * se score 95). diverseTopProducts() zajistí max maxPerBrand položek jedné značky.
 * Overflow (přesahující brand cap) se přidá na konec — nikdy nezahazujeme.
 */

type WithScore = { olivatorScore: number | null; brandSlug?: string | null }

/**
 * Vrátí `limit` produktů seřazených dle score s cap maxPerBrand položek
 * na jednu značku. Produkty bez brandSlug jsou groupovány jako 'unknown'.
 *
 * @param products — vstup nemusí být seřazený
 * @param limit    — kolik položek vrátit celkem
 * @param maxPerBrand — max položek jedné značky (default 2)
 */
export function diverseTopProducts<T extends WithScore>(
  products: T[],
  limit: number,
  maxPerBrand = 2,
): T[] {
  const sorted = [...products].sort(
    (a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0),
  )

  const brandCounts: Record<string, number> = {}
  const result: T[] = []
  const overflow: T[] = []

  for (const p of sorted) {
    if (result.length >= limit) break
    const brand = p.brandSlug ?? 'unknown'
    const count = brandCounts[brand] ?? 0
    if (count >= maxPerBrand) {
      overflow.push(p)
      continue
    }
    result.push(p)
    brandCounts[brand] = count + 1
  }

  // Doplň ze overflow pokud result stále kratší než limit
  for (const p of overflow) {
    if (result.length >= limit) break
    result.push(p)
  }

  return result
}
