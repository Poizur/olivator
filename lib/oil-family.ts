// „Stejný olej v jiném balení“ = stejná rodina. Používají žebříčky (jeden olej = jedno místo)
// a newsletter (stejný olej stejným lidem max 1× za 30 dní).

const PACKAGING = /\b(plech\w*|sklo|sklen\w*|kanystr\w*|pet|karaf\w*|design|darkov\w*|edice|gastro|baleni|bag|in|box|poskozen\w*|obal\w*|lahev|lahvi|kus|ks)\b/g
const VOLUME = /\b\d+(?:[.,]\d+)?\s*(?:[-–]\s*\d+(?:[.,]\d+)?\s*)?(?:ml|l|lt|litr\w*)\b/g

export function oilFamilyKey(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(VOLUME, ' ')
    .replace(/[()!–—\-,/|]+/g, ' ')
    .replace(PACKAGING, ' ')
  const tokens = [...new Set(base.split(/\s+/).filter((t) => t.length > 1 || /\d/.test(t)))]
  return tokens.sort().join(' ')
}
