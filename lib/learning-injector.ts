// Learning Injector — Fáze 1 master-foundation plánu.
//
// Cíl: lekce z tabulky project_learnings (extrahované Learning Agentem
// z gitu + agent_decisions) se konečně dostanou do system promptů Claude
// volání. Bez tohoto se agenti nikdy nezlepšují — píší lekce, ale nečtou je.
//
// Použití (před každým callClaude):
//   import { getInjectionBlock } from './learning-injector'
//   const learningsBlock = await getInjectionBlock('content_agent')
//   const systemPrompt = `${learningsBlock}${EXISTING_SYSTEM_PROMPT}`
//
// Blok je PREFIX — má vyšší prioritu než původní instrukce.
//
// Schema project_learnings: id, category, title, description, source, impact,
//   commit_hash, created_at. Kategorie viz lib/learning-agent.ts:
//   deployment|content_quality|agent_behavior|bug_fix|pipeline|
//   architecture_debt|observability|scraper|affiliate
// Impact: critical|high|medium|low

import { supabaseAdmin } from './supabase'

export type AgentName =
  | 'content_agent'
  | 'fact_extractor'       // re-extractor analog — extrakce faktů z raw textu
  | 'flavor_agent'         // odhad chuťového profilu
  | 'discovery_agent'      // orchestrace + pomocná AI volání
  | 'brand_research'       // research značky z webu
  | 'lab_report_agent'     // vision scan lab reportů
  | 'quality_auto_fix'     // auto-fix v quality-rules
  | 'radar_agent'          // RSS překlad

type LearningCategory =
  | 'content_quality'
  | 'bug_fix'
  | 'pipeline'
  | 'scraper'
  | 'agent_behavior'
  | 'observability'
  | 'deployment'
  | 'architecture_debt'
  | 'affiliate'

// Mapování agent → relevantní kategorie. Záměrně překryvy: re-extractor
// těží i z 'scraper' (selektory) i z 'pipeline' (idempotence) i z
// 'agent_behavior' (jak Claude reaguje).
const AGENT_CATEGORIES: Record<AgentName, LearningCategory[]> = {
  content_agent:    ['content_quality', 'agent_behavior'],
  fact_extractor:   ['scraper', 'pipeline', 'agent_behavior', 'content_quality'],
  flavor_agent:     ['content_quality', 'agent_behavior'],
  discovery_agent:  ['scraper', 'pipeline', 'agent_behavior'],
  brand_research:   ['content_quality', 'scraper', 'agent_behavior'],
  lab_report_agent: ['scraper', 'content_quality', 'agent_behavior'],
  quality_auto_fix: ['bug_fix', 'pipeline', 'content_quality'],
  radar_agent:      ['pipeline', 'agent_behavior', 'content_quality'],
}

const IMPACT_RANK: Record<string, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
}

export interface InjectedLearning {
  title: string
  description: string
  impact: string
  category: string
}

interface RawLearning {
  title: string | null
  description: string | null
  impact: string | null
  category: string | null
  created_at: string | null
}

// In-memory cache (5 min TTL). Klíč: agentName. Hodnota: pole lekcí + timestamp.
// Důvod: dávkové běhy (bulk-rescrape, discovery, audit) by jinak tahaly
// 100+ stejných dotazů ze Supabase. Cache se rozpadne 5 min po posledním
// fetchi (lekce přibývají max 1× týdně z cron:learning, ne real-time).
const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  learnings: InjectedLearning[]
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function cacheKey(agentName: AgentName, limit: number): string {
  return `${agentName}::${limit}`
}

/** Načte relevantní lekce pro daného agenta z project_learnings.
 *  Řadí podle impactu (critical → high → medium → low), pak podle created_at desc.
 *  Cachuje 5 min — uvolni přes clearLearningCache() v testech. */
export async function getRelevantLearnings(
  agentName: AgentName,
  limit = 10
): Promise<InjectedLearning[]> {
  const key = cacheKey(agentName, limit)
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.learnings
  }

  const categories = AGENT_CATEGORIES[agentName]
  if (!categories || categories.length === 0) return []

  // Fetch víc než limit aby po custom impact ordering zůstaly nejlepší.
  // 50 stačí — celá tabulka má dnes 46 záznamů, postupný růst je pomalý.
  const { data, error } = await supabaseAdmin
    .from('project_learnings')
    .select('title, description, impact, category, created_at')
    .in('category', categories)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) {
    console.warn('[learning-injector] fetch failed:', error?.message)
    return []
  }

  const learnings = (data as RawLearning[])
    .filter((l): l is RawLearning & { title: string; description: string } =>
      typeof l.title === 'string' && l.title.trim().length > 0
      && typeof l.description === 'string' && l.description.trim().length > 0
    )
    .map(l => ({
      title: l.title,
      description: l.description,
      impact: (l.impact ?? 'medium').toLowerCase(),
      category: (l.category ?? 'agent_behavior').toLowerCase(),
    }))
    // Sort: vyšší impact první, pak novější první (stabilita).
    // PostgreSQL .order na text nezachová critical→low pořadí, řešíme tu.
    .sort((a, b) => {
      const ra = IMPACT_RANK[a.impact] ?? 0
      const rb = IMPACT_RANK[b.impact] ?? 0
      return rb - ra
    })
    .slice(0, limit)

  cache.set(key, { learnings, expiresAt: now + CACHE_TTL_MS })
  return learnings
}

/** Formátuje lekce jako blok pro injekci do system promptu.
 *  Vrací '' pokud žádné lekce — žádný overhead pro nulový vstup. */
export function formatLearningsForPrompt(learnings: InjectedLearning[]): string {
  if (learnings.length === 0) return ''

  const lines: string[] = []
  lines.push('══ LEKCE Z PŘEDCHOZÍCH BĚHŮ (POVINNĚ DODRŽUJ) ══')
  lines.push('')
  lines.push('Tyto poučení vznikly z reálných incidentů (git commit fix/hotfix,')
  lines.push('agent_decisions). Pokud tvoje výstup poruší kteroukoli z nich,')
  lines.push('běh skončí re-extractem a vznikne nová lekce. Dodržuj je striktně.')
  lines.push('')

  for (let i = 0; i < learnings.length; i++) {
    const l = learnings[i]
    lines.push(`${i + 1}. [${l.impact.toUpperCase()}] ${l.title}`)
    // Description může být multi-line s "Prevence: ..." přidanou v learning-agent.
    // Zachováme strukturu ale odsadíme.
    const desc = l.description.split('\n').map(line => `   ${line}`).join('\n')
    lines.push(desc)
    lines.push('')
  }

  lines.push('══ KONEC LEKCÍ ══')
  lines.push('')

  return lines.join('\n')
}

/** Convenience wrapper: jeden call → string pro injekci.
 *  Použij jako prefix system promptu:
 *    const systemPrompt = `${await getInjectionBlock('content_agent')}${EXISTING}` */
export async function getInjectionBlock(
  agentName: AgentName,
  limit = 10
): Promise<string> {
  const learnings = await getRelevantLearnings(agentName, limit)
  return formatLearningsForPrompt(learnings)
}

/** Vymaže cache. Pouze pro testy / admin "refresh learnings" akce.
 *  V produkčním běhu cache expiruje sama po 5 min. */
export function clearLearningCache(): void {
  cache.clear()
}

/** Diagnostika: kolik lekcí by se injektovalo pro daného agenta.
 *  Užitečné v testu a pro admin UI. */
export async function describeInjection(agentName: AgentName, limit = 10): Promise<{
  agent: AgentName
  categories: LearningCategory[]
  count: number
  byImpact: Record<string, number>
  titles: string[]
}> {
  const learnings = await getRelevantLearnings(agentName, limit)
  const byImpact: Record<string, number> = {}
  for (const l of learnings) {
    byImpact[l.impact] = (byImpact[l.impact] ?? 0) + 1
  }
  return {
    agent: agentName,
    categories: AGENT_CATEGORIES[agentName],
    count: learnings.length,
    byImpact,
    titles: learnings.map(l => l.title),
  }
}
