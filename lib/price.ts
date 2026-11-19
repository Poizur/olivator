// Jedna definice „ceny, kterou zákazník zaplatí“: akční cena z feedu, pokud je nižší než běžná.
// Používej všude, kde se z product_offers čte price (stránky, žebříčky, JSON-LD, Olík, e-maily, sync).

export function effectivePrice(price: number | string | null | undefined, actionPrice?: number | string | null): number {
  const p = Number(price ?? 0)
  const a = actionPrice == null ? null : Number(actionPrice)
  return a != null && a > 0 && a < p ? a : p
}

export const POSTGREST_MAX_ROWS = 1000

/** PostgREST tiše ořízne výsledek na 1 000 řádků bez ohledu na .limit(). Přesně 1 000 = pravděpodobně ořezáno. */
export function warnIfCapped<T>(rows: T[] | null | undefined, label: string): T[] {
  const data = rows ?? []
  if (data.length === POSTGREST_MAX_ROWS) {
    console.warn(`[postgrest-cap] ${label}: dotaz vrátil přesně ${POSTGREST_MAX_ROWS} řádků — výsledek je nejspíš oříznutý, přesuň výpočet do SQL`)
  }
  return data
}
