import { supabaseAdmin } from './supabase'

// Supermarkety smí zůstat obecně (bez cen a bez „nejlepší ceny“); specializované obchody mimo spolupráci ne.
const GENERIC_OK = new Set(['rohlik', 'kosik', 'itesco', 'albert', 'kaufland', 'globus', 'mall'])
const PRICE_NEAR_RE = /\d{2,5}\s?(Kč|CZK)/i
const BUY_WORDS_RE = /(nejlepší\s+cen|nejlevněj|koupit\s+u|k\s+dostání\s+u|dostupn\w*\s+(u|na|v)|seženete\s+(u|na|v)|nabízí\s+za|cena\s+u)/i

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Názvy/domény obchodů s is_active=false zmíněné jako místo nákupu (vedle ceny nebo nákupní formulace).
 * Supermarkety projdou jen bez ceny a bez „nejlepší ceny“.
 */
export async function findQuarantinedShopMentions(text: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from('retailers').select('name, slug, domain').eq('is_active', false)
  const hay = stripDiacritics(text)
  const hits: string[] = []
  for (const r of data ?? []) {
    const names = [r.name as string, (r.domain as string | null) ?? '', (r.domain as string | null)?.replace(/^www\./, '').replace(/\.(cz|com|sk)$/, '') ?? '']
      .map(stripDiacritics)
      .filter((n) => n.length >= 4)
    for (const n of names) {
      let idx = hay.indexOf(n)
      while (idx >= 0) {
        const ctx = hay.slice(Math.max(0, idx - 80), idx + n.length + 80)
        const generic = GENERIC_OK.has(r.slug as string)
        if (!generic || PRICE_NEAR_RE.test(ctx) || BUY_WORDS_RE.test(ctx)) {
          hits.push(r.name as string)
          break
        }
        idx = hay.indexOf(n, idx + n.length)
      }
      if (hits.includes(r.name as string)) break
    }
  }
  return [...new Set(hits)]
}
