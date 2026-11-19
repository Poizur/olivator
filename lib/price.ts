// Jedna definice „ceny, kterou zákazník zaplatí“: akční cena z feedu, pokud je nižší než běžná.
// Používej všude, kde se z product_offers čte price (stránky, žebříčky, JSON-LD, Olík, e-maily, sync).

export function effectivePrice(price: number | string | null | undefined, actionPrice?: number | string | null): number {
  const p = Number(price ?? 0)
  const a = actionPrice == null ? null : Number(actionPrice)
  return a != null && a > 0 && a < p ? a : p
}

/** Datum zlevnění bez roku, česky a v pražském čase: „30. 9.“ */
export function formatDealDate(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Prague' })
}

/** Pravidlo slevy slovy — jedno místo pro /slevy, homepage a e-maily. */
export const DEAL_RULE_TEXT =
  'Slevu ukazujeme, jen když je dnešní cena aspoň o 5 % nižší než nejnižší cena, za kterou ji obchod prodával během 30 dní před zlevněním, a zlevnění není starší než 90 dní.'

export const POSTGREST_MAX_ROWS = 1000

/** PostgREST tiše ořízne výsledek na 1 000 řádků bez ohledu na .limit(). Přesně 1 000 = pravděpodobně ořezáno. */
export function warnIfCapped<T>(rows: T[] | null | undefined, label: string): T[] {
  const data = rows ?? []
  if (data.length === POSTGREST_MAX_ROWS) {
    console.warn(`[postgrest-cap] ${label}: dotaz vrátil přesně ${POSTGREST_MAX_ROWS} řádků — výsledek je nejspíš oříznutý, přesuň výpočet do SQL`)
  }
  return data
}
