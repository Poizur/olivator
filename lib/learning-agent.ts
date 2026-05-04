// Olivator Learning Agent — TS port z AIkompass intelligent_learning_agent.py.
//
// Pipeline:
//   1. Fetch incidents (GitHub commits s 'fix'/'hotfix'/'revert' za posledních N hodin)
//   2. Claude Haiku extrakt candidate learning (worth_learning flag)
//   3. Stage 1: token-set ratio vs existing learnings
//      - score >= 95 → auto-duplicate
//      - score < 40  → auto-unique
//      - 40-95       → Stage 2
//   4. Stage 2: Haiku judge — shortlist top 20, decide if duplicate
//   5. Insert do project_learnings
//
// Volá se z scripts/cron/learning.ts (týdenně) nebo /api/cron/learning.
// Olivator skip error_log fetch (nemáme tu tabulku) — primární zdroj GitHub.

import { supabaseAdmin } from './supabase'
import { callClaude, extractText } from './anthropic'
import { tokenSetRatio } from './token-fuzz'

const FUZZY_AUTO_DUPLICATE_THRESHOLD = 95
const FUZZY_AUTO_UNIQUE_THRESHOLD = 40
const DAILY_CANDIDATE_LIMIT = 100

const LEARNING_AGENT_WHITELIST = new Set<string>([
  'radar_agent',
  'content_agent',
  'feed_sync',
  'discovery_agent',
  'image_agent',
  'score_agent',
  'manager_agent',
])

const EXTRACTION_SYSTEM = `Jsi analytik provozních incidentů pro Olivator.cz (Next.js + Supabase + Claude API).
Z incidentu vyextrahuješ jedno konkrétní learning pro project_learnings tabulku.

JAZYK: Všechny texty vrať VÝHRADNĚ v češtině. Technické termíny (API, timeout, Supabase) mohou zůstat anglicky.

Vracíš POUZE validní JSON, žádný markdown:
{
  "title": "max 100 znaků, konkrétní, akční, česky",
  "category": "deployment|content_quality|agent_behavior|bug_fix|pipeline|architecture_debt|observability|scraper|affiliate",
  "severity": "critical|high|medium|low",
  "context": "max 400 znaků: co se stalo, kdy, dopad",
  "prevention": "max 300 znaků: co udělat aby se neopakovalo",
  "worth_learning": true/false
}

worth_learning=false pro:
- retry-succeeded (transient HTTP/timeout co se vyřešil sám)
- rate limit hits bez trvalého dopadu
- rutinní DB constraint warnings co agent sám zvládl

worth_learning=true pro:
- build failures, deployment crashes
- nové chyby s novým root cause
- constraint violations co zastavily pipeline
- architektonické problémy (např. transakce, idempotency)
- scraper / affiliate pipeline regression`

const JUDGE_SYSTEM = `Jsi judge pro deduplikaci learnings.
Dostaneš NOVÝ learning a shortlist EXISTUJÍCÍCH learnings.
Rozhodni: je nový skutečně nový, nebo duplikát?

Vracíš POUZE validní JSON:
{"is_duplicate": true|false, "matched_id": <index 0-based>|null, "similarity_reason": "max 200 znaků česky"}

SKUTEČNÝ DUPLIKÁT vyžaduje alespoň JEDNO z:
 - Stejnou funkci/soubor/API
 - Stejný mechanismus selhání
 - Stejný konfigurační problém

Pokud je jen stejná kategorie ale různý způsob selhání → is_duplicate: false.`

interface Incident {
  source: string
  sourceId: string
  timestamp: string
  agentName: string
  errorType: string
  errorMessage: string
  context: Record<string, unknown>
}

interface CandidateLearning {
  title: string
  category: string
  impact: string
  description: string
  source: string
  commitHash: string | null
}

interface ExistingLearning {
  id: string
  title: string
  description: string | null
}

export interface LearningRunResult {
  totalIncidents: number
  accepted: number
  rejectedDuplicate: number
  rejectedNotWorth: number
  byCategory: Record<string, number>
  errors: string[]
  startedAt: string
  finishedAt: string
}

function stripJsonFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
}

async function fetchGitHubCommits(hoursBack: number): Promise<Incident[]> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO ?? 'Poizur/olivator'
  if (!repo) return []

  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
  const incidents: Incident[] = []

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'OlivatorBot/1.0',
      Accept: 'application/vnd.github+json',
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const url = `https://api.github.com/repos/${repo}/commits?since=${cutoff}&per_page=50`
    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    if (!resp.ok) {
      console.warn(`[learning] GitHub commits fetch ${repo}: HTTP ${resp.status}`)
      return []
    }
    const commits = (await resp.json()) as Array<{
      sha: string
      commit: { message: string; committer: { date: string } }
    }>
    for (const c of commits) {
      const msg = c.commit.message
      if (!/\b(fix|hotfix|rollback|revert)\b/i.test(msg)) continue
      incidents.push({
        source: 'git_commit',
        sourceId: c.sha,
        timestamp: c.commit.committer.date,
        agentName: 'git',
        errorType: 'commit_fix',
        errorMessage: msg.slice(0, 1500),
        context: { repo, sha: c.sha.slice(0, 12) },
      })
    }
  } catch (err) {
    console.warn(`[learning] GitHub fetch failed:`, err instanceof Error ? err.message : err)
  }
  return incidents
}

async function fetchAgentDecisions(hoursBack: number): Promise<Incident[]> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('agent_decisions')
    .select('id, agent_name, decision_type, payload, created_at')
    .gte('created_at', cutoff)
    .limit(DAILY_CANDIDATE_LIMIT)
  if (error || !data) return []

  const incidents: Incident[] = []
  for (const r of data as Array<{
    id: string
    agent_name: string | null
    decision_type: string | null
    payload: Record<string, unknown> | null
    created_at: string
  }>) {
    const agent = r.agent_name ?? ''
    if (!LEARNING_AGENT_WHITELIST.has(agent)) continue
    incidents.push({
      source: 'agent_decisions',
      sourceId: r.id,
      timestamp: r.created_at,
      agentName: agent,
      errorType: r.decision_type ?? 'unknown',
      errorMessage: JSON.stringify(r.payload ?? {}).slice(0, 1500),
      context: { decisionType: r.decision_type ?? '' },
    })
  }
  return incidents
}

async function extractCandidate(incident: Incident): Promise<CandidateLearning | null> {
  const userMsg = [
    `INCIDENT:`,
    `Zdroj: ${incident.source}`,
    `Čas: ${incident.timestamp}`,
    `Agent: ${incident.agentName}`,
    `Typ: ${incident.errorType}`,
    ``,
    `Zpráva:`,
    incident.errorMessage.slice(0, 1500),
    ``,
    `Context:`,
    JSON.stringify(incident.context).slice(0, 800),
  ].join('\n')

  try {
    const resp = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })
    const data = JSON.parse(stripJsonFences(extractText(resp))) as Partial<{
      title: string
      category: string
      severity: string
      context: string
      prevention: string
      worth_learning: boolean
    }>
    if (!data.worth_learning) return null
    const title = (data.title ?? '').trim()
    if (!title) return null

    return {
      title: title.slice(0, 200),
      category: (data.category ?? 'bug_fix').trim().slice(0, 50),
      impact: (data.severity ?? 'medium').trim().slice(0, 20),
      description: ((data.context ?? '') + '\n\nPrevence: ' + (data.prevention ?? '')).slice(0, 2000),
      source: incident.source,
      commitHash: incident.source === 'git_commit' ? (incident.context.sha as string) ?? null : null,
    }
  } catch (err) {
    console.warn(`[learning] extract failed:`, err instanceof Error ? err.message : err)
    return null
  }
}

interface FuzzDecision {
  outcome: 'auto_duplicate' | 'auto_unique' | 'ambiguous'
  shortlist: ExistingLearning[]
  topScore: number
}

function fuzzPrefilter(candidate: CandidateLearning, existing: ExistingLearning[]): FuzzDecision {
  const candText = `${candidate.title} ${candidate.description}`
  const scored = existing
    .map((ex) => ({
      score: tokenSetRatio(candText, `${ex.title} ${ex.description ?? ''}`),
      ex,
    }))
    .sort((a, b) => b.score - a.score)
  const topScore = scored[0]?.score ?? 0

  if (topScore >= FUZZY_AUTO_DUPLICATE_THRESHOLD) {
    return { outcome: 'auto_duplicate', shortlist: [scored[0].ex], topScore }
  }
  if (topScore < FUZZY_AUTO_UNIQUE_THRESHOLD) {
    return { outcome: 'auto_unique', shortlist: [], topScore }
  }
  return { outcome: 'ambiguous', shortlist: scored.slice(0, 20).map((s) => s.ex), topScore }
}

async function haikuJudge(candidate: CandidateLearning, shortlist: ExistingLearning[]): Promise<boolean> {
  const existingBlock = shortlist
    .map((ex, i) => `[${i}] title: ${ex.title}\n    context: ${(ex.description ?? '').slice(0, 300)}`)
    .join('\n')
  const userMsg = [
    `NOVÝ LEARNING:`,
    `title: ${candidate.title}`,
    `context: ${candidate.description.slice(0, 500)}`,
    ``,
    `EXISTUJÍCÍ LEARNINGS (shortlist):`,
    existingBlock,
  ].join('\n')

  try {
    const resp = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: JUDGE_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })
    const data = JSON.parse(stripJsonFences(extractText(resp))) as { is_duplicate?: boolean }
    return Boolean(data.is_duplicate)
  } catch {
    return false  // konzervativně: neoznačit jako duplikát při chybě
  }
}

async function insertLearning(c: CandidateLearning): Promise<void> {
  const { error } = await supabaseAdmin.from('project_learnings').insert({
    category: c.category,
    title: c.title,
    description: c.description,
    source: `intelligent:${c.source}`,
    impact: c.impact,
    commit_hash: c.commitHash,
  })
  if (error) console.warn(`[learning] insert failed:`, error.message)
}

export async function runLearningExtraction(opts: { hoursBack?: number; dryRun?: boolean } = {}): Promise<LearningRunResult> {
  const startedAt = new Date().toISOString()
  const hoursBack = opts.hoursBack ?? 24 * 7  // default týden
  const dryRun = opts.dryRun ?? false

  const result: LearningRunResult = {
    totalIncidents: 0,
    accepted: 0,
    rejectedDuplicate: 0,
    rejectedNotWorth: 0,
    byCategory: {},
    errors: [],
    startedAt,
    finishedAt: '',
  }

  const [gitIncidents, agentIncidents] = await Promise.all([
    fetchGitHubCommits(hoursBack),
    fetchAgentDecisions(hoursBack),
  ])
  const incidents = [...gitIncidents, ...agentIncidents]
  result.totalIncidents = incidents.length

  if (incidents.length > DAILY_CANDIDATE_LIMIT) {
    result.errors.push(`too many candidates: ${incidents.length} > ${DAILY_CANDIDATE_LIMIT}`)
    result.finishedAt = new Date().toISOString()
    return result
  }

  const { data: existingRows } = await supabaseAdmin
    .from('project_learnings')
    .select('id, title, description')
    .order('created_at', { ascending: false })
    .limit(500)
  const existing: ExistingLearning[] = (existingRows ?? []) as ExistingLearning[]

  for (const inc of incidents) {
    const candidate = await extractCandidate(inc)
    if (!candidate) {
      result.rejectedNotWorth++
      continue
    }

    const { outcome, shortlist } = fuzzPrefilter(candidate, existing)

    if (outcome === 'auto_duplicate') {
      result.rejectedDuplicate++
      continue
    }
    if (outcome === 'auto_unique') {
      if (!dryRun) await insertLearning(candidate)
      result.accepted++
      result.byCategory[candidate.category] = (result.byCategory[candidate.category] ?? 0) + 1
      existing.push({ id: 'pending', title: candidate.title, description: candidate.description })
      continue
    }

    // Ambiguous → Haiku judge
    const isDup = await haikuJudge(candidate, shortlist)
    if (isDup) {
      result.rejectedDuplicate++
      continue
    }
    if (!dryRun) await insertLearning(candidate)
    result.accepted++
    result.byCategory[candidate.category] = (result.byCategory[candidate.category] ?? 0) + 1
    existing.push({ id: 'pending', title: candidate.title, description: candidate.description })
  }

  result.finishedAt = new Date().toISOString()
  return result
}
