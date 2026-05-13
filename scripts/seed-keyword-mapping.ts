/**
 * Seeds keyword_mapping table from Marketing Miner export.
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/seed-keyword-mapping.ts
 *
 * NOTE: This file contains 30 of 379 keywords from the export.
 * Extend KEYWORDS_DATA with full list when available.
 */
import { supabaseAdmin } from '@/lib/supabase'

const KEYWORDS_DATA = [
  { keyword: 'olivový olej', volume: 2700, cpc: 4.59, competition: 10, yoy_change: 128.7 },
  { keyword: 'olivovy olej', volume: 1500, cpc: 7.31, competition: 10, yoy_change: -29.3 },
  { keyword: 'olivový olej akce', volume: 1400, cpc: 2.92, competition: 19, yoy_change: 221.7 },
  { keyword: 'řecký olivový olej', volume: 610, cpc: 2.5, competition: null, yoy_change: 52.6 },
  { keyword: 'extra panenský olivový olej', volume: 560, cpc: 6.58, competition: 16, yoy_change: -17.4 },
  { keyword: 'olivový olej v akci', volume: 480, cpc: 4.76, competition: 20, yoy_change: 46.9 },
  { keyword: 'olivový olej na smažení', volume: 480, cpc: 1.28, competition: 15, yoy_change: -6.8 },
  { keyword: 'nejlepší řecký olivový olej', volume: 460, cpc: 4.14, competition: null, yoy_change: -26.7 },
  { keyword: 'olivový olej kréta', volume: 460, cpc: 2.82, competition: null, yoy_change: 7.1 },
  { keyword: 'olivový olej ve spreji', volume: 430, cpc: 3.52, competition: 11, yoy_change: 43.4 },
  { keyword: 'olivový olej zdravotní účinky', volume: 420, cpc: 0, competition: null, yoy_change: -26.7 },
  { keyword: 'je olivový olej zdravý', volume: 410, cpc: 1.24, competition: null, yoy_change: 26.7 },
  { keyword: 'citronový olivový olej', volume: 390, cpc: 3.52, competition: null, yoy_change: 21.1 },
  { keyword: 'kvalitní olivový olej prodej', volume: 380, cpc: 3.1, competition: null, yoy_change: 275 },
  { keyword: 'krétský olivový olej', volume: 370, cpc: 4.55, competition: null, yoy_change: null },
  { keyword: 'olivový olej kvalita', volume: 370, cpc: 0.83, competition: null, yoy_change: null },
  { keyword: 'olivový olej z pokrutin', volume: 370, cpc: 3.36, competition: 27, yoy_change: -3.5 },
  { keyword: 'olivový olej na opalování', volume: 360, cpc: 4.96, competition: null, yoy_change: -11.9 },
  { keyword: 'jaký olivový olej', volume: 340, cpc: 0, competition: null, yoy_change: -15.4 },
  { keyword: 'olivový olej extra panenský', volume: 320, cpc: 6.62, competition: 6, yoy_change: 37.3 },
  { keyword: 'domácí olivový olej', volume: 310, cpc: 4.55, competition: null, yoy_change: 6.7 },
  { keyword: 'olivový olej po ránu', volume: 310, cpc: 0, competition: null, yoy_change: 18.2 },
  { keyword: 'nejkvalitnější olivový olej', volume: 300, cpc: 2.19, competition: null, yoy_change: 26.1 },
  { keyword: 'kvalitní olivový olej', volume: 300, cpc: 6.62, competition: 0, yoy_change: 37.2 },
  { keyword: 'panenský olivový olej', volume: 300, cpc: 8.31, competition: 0, yoy_change: -19.3 },
  { keyword: 'nejlepší olivový olej', volume: 290, cpc: 4.91, competition: 13, yoy_change: -16.9 },
  { keyword: 'olivový olej zdraví', volume: 290, cpc: 0.56, competition: 20, yoy_change: 22.3 },
  { keyword: 'olivovy olej extra panensky', volume: 290, cpc: 6.62, competition: null, yoy_change: 37.3 },
  { keyword: 'extra panenský olivový olej cena', volume: 290, cpc: 4.55, competition: null, yoy_change: null },
  { keyword: 'olivový olej na vlasy', volume: 250, cpc: 0.43, competition: 19, yoy_change: -31 },
]

function detectIntent(keyword: string): string {
  const lower = keyword.toLowerCase()
  if (lower.includes('akce') || lower.includes('sleva') || lower.includes('koupit') ||
      lower.includes('cena') || lower.includes('prodej')) return 'commercial'
  const brands = ['lidl', 'tesco', 'monini', 'borges', 'bertolli', 'franz josef',
                  'kaufland', 'albert', 'billa', 'costa d oro', 'minerva', 'primadonna']
  if (brands.some(b => lower.includes(b))) return 'navigational'
  if (lower.includes('jak ') || lower.includes('co je') || lower.includes('proč') ||
      lower.startsWith('je ') || lower.includes('účinky') || lower.includes('zdrav')) return 'informational'
  return 'informational'
}

function detectCluster(keyword: string): string {
  const lower = keyword.toLowerCase()
  if (lower.includes('řeck') || lower.includes('recky') || lower.includes('krét') || lower.includes('kret')) return 'regional_GR'
  if (lower.includes('italsk')) return 'regional_IT'
  if (lower.includes('španělsk')) return 'regional_ES'
  if (lower.includes('lidl')) return 'brand_lidl'
  if (lower.includes('tesco')) return 'brand_tesco'
  if (lower.includes('monini')) return 'brand_monini'
  if (lower.includes('borges')) return 'brand_borges'
  if (lower.includes('bertolli')) return 'brand_bertolli'
  if (lower.includes('kaufland')) return 'brand_kaufland'
  if (lower.includes('akce') || lower.includes('sleva')) return 'commercial_akce'
  if (lower.includes('smažen') || lower.includes('vaření')) return 'use_cooking'
  if (lower.includes('pleť') || lower.includes('vlas') || lower.includes('opalován')) return 'use_skincare'
  if (lower.includes('zdrav') || lower.includes('účinky') || lower.includes('cholesterol')) return 'health'
  if (lower.includes('sprej')) return 'product_spray'
  if (lower.includes('5l') || lower.includes('1l') || lower.includes('plech')) return 'product_volume'
  if (lower.includes('bio')) return 'product_bio'
  if (lower.includes('extra panensk') || lower.includes('panensk')) return 'product_type'
  return 'general'
}

function calculatePriority(volume: number, intent: string): number {
  const multiplier: Record<string, number> = { commercial: 1.5, navigational: 1.3, informational: 1.0 }
  const score = volume * (multiplier[intent] ?? 1.0)
  if (score > 2000) return 5
  if (score > 500) return 4
  if (score > 200) return 3
  if (score > 50) return 2
  return 1
}

async function main() {
  let inserted = 0, failed = 0

  for (const kw of KEYWORDS_DATA) {
    const intent = detectIntent(kw.keyword)
    const cluster = detectCluster(kw.keyword)
    const priority = calculatePriority(kw.volume, intent)

    const { error } = await supabaseAdmin
      .from('keyword_mapping')
      .upsert({
        keyword: kw.keyword,
        search_volume: kw.volume,
        cpc_czk: kw.cpc ?? 0,
        competition_score: kw.competition ?? null,
        yoy_change_pct: kw.yoy_change ?? null,
        intent,
        cluster_group: cluster,
        priority,
        status: 'unmapped',
      }, { onConflict: 'keyword' })

    if (error) { console.error(`FAIL: ${kw.keyword}`, error.message); failed++ }
    else { console.log(`  ok  ${kw.keyword} (${intent}, ${cluster}, p${priority})`); inserted++ }
  }

  console.log(`\nDone — inserted/updated: ${inserted}, failed: ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
