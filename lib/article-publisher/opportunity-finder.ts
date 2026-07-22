// Opportunity Finder — hledá nejsilnější keyword příležitosti pro nové články
// Zdroj: keyword_mapping (205 rows). GSC tabulky (gsc_pages/queries) jsou prázdné.
// TYP 1 striking_distance  — status='weak', máme stránku ale slabá pozice
// TYP 2 content_gap        — status='gap', žádný článek na keyword
// TYP 3 rising_query       — yoy_change_pct > 40 (rychle rostoucí dotazy)

import { supabaseAdmin } from '@/lib/supabase'
import { getRelevantLearnings } from '@/lib/learning-memory'

export interface Opportunity {
  keyword: string
  opportunityType: 'striking_distance' | 'content_gap' | 'rising_query'
  searchVolume: number
  yoyChangePct: number | null
  existingUrl: string | null
  cannibalizeRisk: string | null
  priorityScore: number
  clusterGroup: string | null
  intent: string | null
}

// Načtení aktivních článků a covered keywords pro kanibalizační check
async function loadCoveredArticles(): Promise<{ slugs: string[]; titles: string[]; coveredKeywords: string[] }> {
  const [articlesRes, coveredRes] = await Promise.all([
    supabaseAdmin.from('articles').select('slug, meta_title').eq('status', 'active'),
    supabaseAdmin.from('keyword_mapping').select('keyword, target_url').eq('status', 'covered').not('target_url', 'is', null),
  ])

  const slugs = (articlesRes.data ?? []).map(a => a.slug as string)
  const titles = (articlesRes.data ?? []).map(a => (a.meta_title as string | null) ?? '')
  const coveredKeywords = (coveredRes.data ?? []).map(r => (r.keyword as string).toLowerCase())

  return { slugs, titles, coveredKeywords }
}

// Zjistí, jestli keyword naráží na existující obsah (kanibalizace)
function detectCanibalization(
  keyword: string,
  existingUrl: string | null,
  covered: { slugs: string[]; titles: string[]; coveredKeywords: string[] }
): string | null {
  const kw = keyword.toLowerCase()

  // 1. Přímo krytý existujícím URL → jen optimalizace, ne nový článek
  if (existingUrl) return null // striking_distance: nechceme blokovat, ale označíme

  // 2. Klíčová slova jsou covered v keyword_mapping
  if (covered.coveredKeywords.some(ck => ck === kw)) return `keyword '${keyword}' je covered v keyword_mapping`

  // 3. Signifikantní slova ze keyword vs. title existujícího článku
  const kwWords = kw.split(/\s+/).filter(w => w.length > 4)
  for (const title of covered.titles) {
    const titleLower = title.toLowerCase()
    const matchedWords = kwWords.filter(w => titleLower.includes(w))
    if (matchedWords.length >= 2 && matchedWords.length >= kwWords.length * 0.6) {
      return `překryv s existujícím článkem: "${title.slice(0, 60)}"`
    }
  }

  return null
}

// Priority score: vyšší = lepší příležitost
function calcPriorityScore(opts: {
  searchVolume: number
  yoyChangePct: number | null
  opportunityType: 'striking_distance' | 'content_gap' | 'rising_query'
  cannibalizeRisk: string | null
  intent: string | null
}): number {
  const { searchVolume, yoyChangePct, opportunityType, cannibalizeRisk, intent } = opts

  // Base: log search volume (normalizace)
  let score = Math.log10(Math.max(searchVolume, 1)) * 20

  // Trend bonus (max +30)
  if (yoyChangePct && yoyChangePct > 0) score += Math.min(yoyChangePct / 10, 30)

  // Typ bonus
  if (opportunityType === 'striking_distance') score += 25  // nejsnazší win
  if (opportunityType === 'rising_query') score += 15       // trendy = dobré načasování

  // Intent: informational = hlavní cíl blogu, commercial = affiliate hodnota
  if (intent === 'informational') score += 10
  if (intent === 'commercial') score += 20
  if (intent === 'navigational') score -= 15  // navigational = špatná příležitost

  // Kanibalizace: penalizuj (nezakazuj, ale snižuj prioritu)
  if (cannibalizeRisk) score -= 40

  return Math.round(score * 10) / 10
}

export async function findOpportunities(limit = 5): Promise<Opportunity[]> {
  const [covered, learnings] = await Promise.all([
    loadCoveredArticles(),
    getRelevantLearnings({ keywords: ['kanibalizace', 'title', 'obsah', 'gap'], limit: 3 }),
  ])

  if (learnings.length) {
    console.log('[opportunity-finder] Loaded learnings:', learnings.map(l => l.code).join(', '))
  }

  // TYP 1: striking_distance — weak keywords kde máme URL ale slabou pozici
  const { data: weakRows } = await supabaseAdmin
    .from('keyword_mapping')
    .select('keyword, search_volume, yoy_change_pct, intent, cluster_group, target_url')
    .eq('status', 'weak')
    .neq('intent', 'navigational')
    .order('search_volume', { ascending: false })
    .limit(30)

  // TYP 2+3: content_gap + rising — gap keywords bez stránky
  const { data: gapRows } = await supabaseAdmin
    .from('keyword_mapping')
    .select('keyword, search_volume, yoy_change_pct, intent, cluster_group')
    .eq('status', 'gap')
    .neq('intent', 'navigational')
    .order('search_volume', { ascending: false })
    .limit(60)

  const candidates: Opportunity[] = []

  // Zpracuj weak (striking_distance)
  for (const row of (weakRows ?? [])) {
    const sv = (row.search_volume as number) ?? 0
    if (sv < 30) continue

    const cannibalizeRisk = detectCanibalization(row.keyword as string, row.target_url as string | null, covered)
    const opportunityType = 'striking_distance'
    const yoy = row.yoy_change_pct as number | null

    candidates.push({
      keyword: row.keyword as string,
      opportunityType,
      searchVolume: sv,
      yoyChangePct: yoy,
      existingUrl: row.target_url as string | null,
      cannibalizeRisk,
      priorityScore: calcPriorityScore({ searchVolume: sv, yoyChangePct: yoy, opportunityType, cannibalizeRisk, intent: row.intent as string | null }),
      clusterGroup: row.cluster_group as string | null,
      intent: row.intent as string | null,
    })
  }

  // Zpracuj gap (content_gap nebo rising_query)
  for (const row of (gapRows ?? [])) {
    const sv = (row.search_volume as number) ?? 0
    if (sv < 50) continue

    const yoy = row.yoy_change_pct as number | null
    const opportunityType: 'content_gap' | 'rising_query' =
      yoy && yoy > 40 ? 'rising_query' : 'content_gap'

    const cannibalizeRisk = detectCanibalization(row.keyword as string, null, covered)

    candidates.push({
      keyword: row.keyword as string,
      opportunityType,
      searchVolume: sv,
      yoyChangePct: yoy,
      existingUrl: null,
      cannibalizeRisk,
      priorityScore: calcPriorityScore({ searchVolume: sv, yoyChangePct: yoy, opportunityType, cannibalizeRisk, intent: row.intent as string | null }),
      clusterGroup: row.cluster_group as string | null,
      intent: row.intent as string | null,
    })
  }

  // Deduplikuj (někdy přijde stejný keyword z obou queries)
  const seen = new Set<string>()
  const deduped = candidates.filter(c => {
    if (seen.has(c.keyword)) return false
    seen.add(c.keyword)
    return true
  })

  return deduped.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, limit)
}

export async function saveOpportunities(opportunities: Opportunity[]): Promise<void> {
  // Smazej staré 'identified' záznamy (nahradíme novějšími)
  await supabaseAdmin
    .from('article_opportunities')
    .delete()
    .eq('status', 'identified')

  if (!opportunities.length) return

  const rows = opportunities.map(o => ({
    keyword: o.keyword,
    opportunity_type: o.opportunityType,
    gsc_impressions: o.searchVolume,  // keyword_mapping.search_volume jako proxy
    gsc_position: o.opportunityType === 'striking_distance' ? 12 : null,  // proxy
    gsc_clicks: null,
    existing_url: o.existingUrl,
    cannibalize_risk: o.cannibalizeRisk,
    status: 'identified',
    priority_score: o.priorityScore,
  }))

  const { error } = await supabaseAdmin.from('article_opportunities').insert(rows)
  if (error) throw new Error(`saveOpportunities insert: ${error.message}`)
}
