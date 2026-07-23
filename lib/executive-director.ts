// AI Ředitel — týdenní executive brief.
//
// Sbírá 8 zdrojů dat za uplynulých 7 dní, předá Sonnet k analýze,
// vrátí brief se sekcemi STAV/ČEKÁ/NAŠEL/POSUN/ROZHODNUTÍ/PAMĚŤ.
// Cron: neděle 20:00 UTC (0 20 * * 0).

import { callClaude, extractText } from './anthropic'
import { supabaseAdmin } from './supabase'
import { fetchGscSummary } from './gsc'
import { getRelevantLearnings, recordApplication, formatLearningsForPrompt } from './learning-memory'

const MODEL = 'claude-sonnet-4-6'
// Sonnet 4.6 pricing: $3/MTok input, $15/MTok output
const COST_PER_INPUT_TOKEN = 3 / 1_000_000
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000

// ── Typy ──────────────────────────────────────────────────────────────────────

export interface DecisionOption {
  label: string
  description: string
  impact: string
}

export interface BriefDecision {
  key: string
  title: string
  context: string
  roi: string       // odhad přímého přínosu (konkrétní čísla nebo %)
  cas: string       // odhad časové náročnosti implementace
  options: DecisionOption[]
  recommended_option: string
  priority: 'high' | 'medium' | 'low'
  category: 'seo' | 'content' | 'affiliate' | 'product' | 'tech' | 'newsletter' | 'catalog' | 'growth'
  learning_applied: string | null   // kód lekce (L-001...) nebo null
  executor_rule: 'fix_affiliate_url' | 'recalc_score' | null  // auto-spuštění po ANO
}

export interface BriefMetric {
  label: string
  value: string | number
  unit?: string
  note?: string
}

export interface BriefJson {
  tldr: string        // 1 věta + počet čekajících akcí
  stav: {
    summary: string
    metrics: BriefMetric[]
  }
  ceka: string[]      // co čeká na akci (bez rozhodnutí)
  nasel: string[]     // anomálie / překvapivé nálezy (max 3)
  posun: string       // co se zásadně změnilo (max 3 odrážky)
  rozhodnuti: BriefDecision[]
  pamet: {
    learnings_used: string[]   // kódy lekcí (L-001...)
    patterns_noted: string[]   // nové patterny ke sledování
  }
  systemTyden?: string  // 🤖 autonomní akce tohoto týdne — buildovány z agent_decisions
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  generationMs: number
}

export interface RawBriefData {
  gsc: object
  catalog: object
  affiliate: object
  newsletter: object
  crons: object
  git: object
  pendingDecisions: object
  learningStats: object
  scanFindings: object
  articleDrafts: object
  autonomousActions: object
  priceWatch: object
}

export interface GenerateBriefResult {
  briefId: string
  weekLabel: string
  decisionCount: number
  rawData: RawBriefData
  briefJson: BriefJson | null
  tokenUsage?: TokenUsage
  error?: string
}

// ── Datové zdroje ─────────────────────────────────────────────────────────────

async function collectGsc(): Promise<object> {
  try {
    const summary = await fetchGscSummary(7)
    if (!summary) return { available: false, reason: 'GSC not configured' }
    return {
      available: true,
      totalClicks: summary.totalClicks,
      totalImpressions: summary.totalImpressions,
      avgPosition: summary.avgPosition,
      topPages: summary.topPages?.slice(0, 5) ?? [],
      topQueries: summary.topQueries?.slice(0, 5) ?? [],
    }
  } catch (err) {
    return { available: false, reason: err instanceof Error ? err.message : 'GSC error' }
  }
}

async function collectCatalog(): Promise<object> {
  const [activeRes, draftRes, scoreRes] = await Promise.all([
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabaseAdmin.from('products').select('olivator_score').eq('status', 'active').not('olivator_score', 'is', null),
  ])
  const scores = (scoreRes.data ?? []).map((p) => p.olivator_score as number)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  return {
    activeProducts: activeRes.count ?? 0,
    draftProducts: draftRes.count ?? 0,
    avgScore,
    scoreDistribution: {
      topTier: scores.filter((s) => s >= 85).length,
      midTier: scores.filter((s) => s >= 70 && s < 85).length,
      lowTier: scores.filter((s) => s < 70).length,
    },
  }
}

async function collectAffiliate(): Promise<object> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: clicks, count: totalClicks } = await supabaseAdmin
    .from('affiliate_clicks').select('product_id, retailer_id, source_type', { count: 'exact' }).gte('clicked_at', since)

  const productCounts: Record<string, number> = {}
  const retailerCounts: Record<string, number> = {}
  const sourceTypeCounts: Record<string, number> = {}
  for (const c of clicks ?? []) {
    if (c.product_id) productCounts[c.product_id] = (productCounts[c.product_id] ?? 0) + 1
    if (c.retailer_id) retailerCounts[c.retailer_id] = (retailerCounts[c.retailer_id] ?? 0) + 1
    const st = (c.source_type as string | null) ?? 'unknown'
    sourceTypeCounts[st] = (sourceTypeCounts[st] ?? 0) + 1
  }

  const topProductIds = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id)
  const topRetailerIds = Object.entries(retailerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id)

  let topProducts: Array<{ slug: string; clicks: number }> = []
  let topRetailers: Array<{ name: string; clicks: number }> = []
  if (topProductIds.length > 0) {
    const { data: products } = await supabaseAdmin.from('products').select('id, slug').in('id', topProductIds)
    topProducts = topProductIds.map((id) => ({ slug: products?.find((p) => p.id === id)?.slug ?? id, clicks: productCounts[id] }))
  }
  if (topRetailerIds.length > 0) {
    const { data: retailers } = await supabaseAdmin.from('retailers').select('id, name').in('id', topRetailerIds)
    topRetailers = topRetailerIds.map((id) => ({ name: retailers?.find((r) => r.id === id)?.name ?? id, clicks: retailerCounts[id] }))
  }

  // Source type breakdown pro brief — seřazeno sestupně, bez unknown pokud máme reálná data
  const total = totalClicks ?? 0
  const sourceBreakdownForBrief = Object.entries(sourceTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([type]) => type !== 'unknown' || Object.keys(sourceTypeCounts).length === 1)
    .map(([type, count]) => ({ type, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))

  // 3-way breakdown — viz L-010: nelze házet dohromady fixable + no-program
  const { data: noAffOffers } = await supabaseAdmin
    .from('product_offers')
    .select('retailer_id, retailers!inner(base_tracking_url)')
    .or('affiliate_url.is.null,affiliate_url.eq.')
    .eq('in_stock', true)

  const fixable = (noAffOffers ?? []).filter(o => {
    const ret = o.retailers as unknown as { base_tracking_url: string | null }
    return !!ret?.base_tracking_url
  }).length
  const noProgram = (noAffOffers ?? []).length - fixable

  return {
    totalClicks: total,
    topProducts,
    topRetailers,
    offersWithoutAffiliate: (noAffOffers ?? []).length,
    affiliateBreakdown: { fixable, noProgram },
    sourceBreakdown: sourceBreakdownForBrief,
  }
}

async function collectNewsletter(): Promise<object> {
  const [lastDraftRes, subscriberRes, pendingCountRes] = await Promise.all([
    supabaseAdmin.from('newsletter_drafts').select('id, status, subject, created_at, reviewer_severity').order('created_at', { ascending: false }).limit(4),
    supabaseAdmin.from('newsletter_signups').select('id', { count: 'exact', head: true }).eq('confirmed', true),
    supabaseAdmin.from('newsletter_drafts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
  ])
  return {
    subscribers: subscriberRes.count ?? 0,
    pendingDrafts: pendingCountRes.count ?? 0,
    lastDrafts: (lastDraftRes.data ?? []).map((d) => ({
      status: d.status, subject: d.subject, createdAt: d.created_at, reviewerSeverity: d.reviewer_severity,
    })),
  }
}

async function collectArticleDrafts(): Promise<object> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [pendingRes, recentRes] = await Promise.all([
    supabaseAdmin.from('article_drafts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabaseAdmin
      .from('article_drafts')
      .select('id, title, reviewer_severity, status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5),
  ])
  return {
    pendingCount: pendingRes.count ?? 0,
    recent: (recentRes.data ?? []).map((d) => ({
      title: d.title,
      severity: d.reviewer_severity,
      status: d.status,
    })),
  }
}

async function collectCronStatus(): Promise<object> {
  const { data: logs } = await supabaseAdmin
    .from('notification_log')
    .select('type, created_at')
    .in('type', ['manager_report', 'discovery_summary', 'broken_tokens_alert', 'prospect_summary', 'executive_brief'])
    .order('created_at', { ascending: false })
    .limit(20)
  const byType: Record<string, string> = {}
  for (const log of logs ?? []) {
    const t = log.type as string
    if (!byType[t]) byType[t] = log.created_at as string
  }
  return byType
}

async function collectGit(): Promise<object> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { available: false, reason: 'GITHUB_TOKEN missing' }
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(
      `https://api.github.com/repos/Poizur/olivator/commits?since=${since}&per_page=20`,
      { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'olivator-agent' } }
    )
    if (!res.ok) return { available: false, reason: `GitHub API ${res.status}` }
    const commits = (await res.json()) as Array<{ sha: string; commit: { message: string } }>
    const lastCommits = commits
      .map((c) => `${c.sha.slice(0, 7)} ${c.commit.message.split('\n')[0]}`)
      .filter((msg) => !msg.includes('Merge '))
      .slice(0, 7)
    return { lastCommits }
  } catch (e) {
    return { available: false, reason: (e as Error).message }
  }
}

async function collectPendingDecisions(): Promise<object> {
  const { data: pending } = await supabaseAdmin
    .from('weekly_decisions').select('title, priority, category, created_at')
    .is('admin_choice', null).order('created_at', { ascending: false }).limit(10)
  return {
    count: pending?.length ?? 0,
    items: (pending ?? []).map((d) => ({
      title: d.title, priority: d.priority, category: d.category,
      ageDays: Math.floor((Date.now() - new Date(d.created_at as string).getTime()) / 86400000),
    })),
  }
}

async function collectLearningStats(): Promise<object> {
  const [topApplied, totalApps, openPatterns] = await Promise.all([
    supabaseAdmin.from('learnings').select('code, title, times_applied').order('times_applied', { ascending: false }).limit(5),
    supabaseAdmin.from('learning_applications').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('patterns_observed').select('id', { count: 'exact', head: true }).eq('status', 'open').gte('occurrences', 2),
  ])
  return {
    topApplied: topApplied.data ?? [],
    totalApplications: totalApps.count ?? 0,
    openPatternsAboveThreshold: openPatterns.count ?? 0,
  }
}

async function collectScanFindings(): Promise<object> {
  const { data, error } = await supabaseAdmin
    .from('site_scan_findings')
    .select('finding_type, severity, url, detail')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return { available: false, reason: error.message }
  const findings = data ?? []
  return {
    total: findings.length,
    high: findings.filter((f) => f.severity === 'high'),
    medium: findings.filter((f) => f.severity === 'medium'),
  }
}

// ── Autonomní akce (agent_decisions posledních 7 dní) ─────────────────────────

interface ActionHighlight {
  agent: string
  type: string
  payload: Record<string, unknown>
}

async function collectAutonomousActions(): Promise<object> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: actions, error } = await supabaseAdmin
    .from('agent_decisions')
    .select('agent_name, decision_type, payload, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error || !actions?.length) return { total: 0, byAgent: {} as Record<string, Record<string, number>>, highlights: [] }

  const byAgent: Record<string, Record<string, number>> = {}
  const highlights: ActionHighlight[] = []

  for (const a of actions) {
    const agent = a.agent_name as string
    const type = a.decision_type as string
    if (!byAgent[agent]) byAgent[agent] = {}
    byAgent[agent][type] = (byAgent[agent][type] ?? 0) + 1
    if (highlights.length < 6 && (type === 'product_deactivated' || type === 'product_published' || type === 'product_reactivated')) {
      highlights.push({ agent, type, payload: (a.payload ?? {}) as Record<string, unknown> })
    }
  }

  return { total: actions.length, byAgent, highlights }
}

function buildSystemSection(autonomousActions: object): string {
  const a = autonomousActions as {
    total: number
    byAgent: Record<string, Record<string, number>>
    highlights: ActionHighlight[]
  }
  if (!a.total) return 'Tento týden žádné autonomní akce zaznamenány.'

  const ag = a.byAgent ?? {}
  const lines: string[] = []

  const lrc = ag['link-rot-checker'] ?? {}
  const lrcDeact = (lrc['offer_deactivated'] ?? 0) + (lrc['product_deactivated'] ?? 0)
  const lrcReact = (lrc['offer_reactivated'] ?? 0) + (lrc['product_reactivated'] ?? 0)
  if (lrcDeact + lrcReact > 0) {
    const parts = []
    if (lrcDeact > 0) parts.push(`${lrcDeact} deaktivací`)
    if (lrcReact > 0) parts.push(`${lrcReact} reaktivací`)
    lines.push(`Link-rot: ${parts.join(', ')}`)
  }

  const rep = ag['reprice'] ?? {}
  const repriceChanges = rep['price_changed'] ?? 0
  const repriceDeact = rep['offer_deactivated'] ?? 0
  if (repriceChanges + repriceDeact > 0) {
    const parts = []
    if (repriceChanges > 0) parts.push(`${repriceChanges} změn cen`)
    if (repriceDeact > 0) parts.push(`${repriceDeact} deaktivací po 404`)
    lines.push(`Reprice: ${parts.join(', ')}`)
  }

  const audit = ag['auto-audit'] ?? {}
  const auditPublish = audit['product_published'] ?? 0
  const auditDeact = audit['product_deactivated'] ?? 0
  if (auditPublish + auditDeact > 0) {
    const parts = []
    if (auditPublish > 0) parts.push(`${auditPublish} auto-publikováno`)
    if (auditDeact > 0) parts.push(`${auditDeact} deaktivováno`)
    lines.push(`Auto-audit: ${parts.join(', ')}`)
  }

  const disc = ag['discovery'] ?? {}
  const discPublish = disc['product_published'] ?? 0
  if (discPublish > 0) {
    lines.push(`Discovery: ${discPublish} nových produktů auto-publikováno`)
  }

  const feed = ag['feed-sync'] ?? {}
  const feedNew = feed['product_created'] ?? 0
  if (feedNew > 0) {
    lines.push(`Feed-sync: ${feedNew} nových draftů`)
  }

  if (lines.length === 0) return `${a.total} akcí zaznamenáno (žádné product-level změny).`

  const highlights = (a.highlights ?? []).slice(0, 3)
  let result = lines.join(' · ')
  if (highlights.length > 0) {
    const examples = highlights.map((h) => {
      const p = h.payload
      const slug = String(p.target_slug ?? p.product_slug ?? p.product_id ?? '').slice(0, 40)
      if (h.type === 'product_deactivated') return `deakt: ${slug}`
      if (h.type === 'product_published') return `pub: ${slug}`
      if (h.type === 'product_reactivated') return `reak: ${slug}`
      return slug
    })
    result += ` · Příklady: ${examples.join(', ')}`
  }
  return result
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(raw: RawBriefData, weekLabel: string, learningSummary: string): string {
  const gsc = raw.gsc as Record<string, unknown>
  const catalog = raw.catalog as Record<string, unknown>
  const affiliate = raw.affiliate as Record<string, unknown>
  const newsletter = raw.newsletter as Record<string, unknown>
  const git = raw.git as Record<string, unknown>
  const pending = raw.pendingDecisions as Record<string, unknown>
  const ls = raw.learningStats as Record<string, unknown>
  const scan = raw.scanFindings as Record<string, unknown>
  const artDrafts = raw.articleDrafts as { pendingCount?: number; recent?: Array<{ title: string; severity: string | null; status: string }> }
  const scoreD = (catalog.scoreDistribution ?? {}) as Record<string, number>
  const affBreakdown = (affiliate.affiliateBreakdown ?? {}) as Record<string, number>

  const topPages = (gsc.topPages as Array<{ keys: string[]; clicks: number }> ?? [])
    .map((p) => `  - ${p.keys[0]?.split('/').slice(-1)[0] ?? '?'}: ${p.clicks} kliků`).join('\n')
  const topProducts = (affiliate.topProducts as Array<{ slug: string; clicks: number }> ?? [])
    .slice(0, 5).map((p) => `  - ${p.slug}: ${p.clicks} kliků`).join('\n')
  const topRetailers = (affiliate.topRetailers as Array<{ name: string; clicks: number }> ?? [])
    .slice(0, 4).map((r) => `  - ${r.name}: ${r.clicks} kliků`).join('\n')
  const sourceBreakdownItems = (affiliate.sourceBreakdown as Array<{ type: string; count: number; pct: number }> ?? [])
  const sourceBreakdownStr = sourceBreakdownItems.length > 0 && sourceBreakdownItems.some((s) => s.type !== 'unknown')
    ? sourceBreakdownItems.map((s) => `  - ${s.type}: ${s.pct} % (${s.count} kliků)`).join('\n')
    : '  (data dostupná od migrace 20260723 — historické kliky nemají source_type)'
  const lastDrafts = (newsletter.lastDrafts as Array<{ status: string; subject: string; reviewerSeverity?: string }> ?? [])
    .map((d) => `  - [${d.status}${d.reviewerSeverity ? ', AI:' + d.reviewerSeverity : ''}] "${d.subject}"`).join('\n')
  const lastCommits = (git.lastCommits as string[] ?? []).slice(0, 7).map((c) => `  - ${c}`).join('\n')
  const pendingItems = (pending.items as Array<{ title: string; priority: string; ageDays: number }> ?? [])
    .map((p) => `  - [${p.priority}, ${p.ageDays}d starý] ${p.title}`).join('\n')
  const scanHigh = (scan.high as Array<{ finding_type: string; url: string; detail: string }> ?? [])
    .map((f) => `  🔴 [${f.finding_type}] ${f.detail} — ${f.url.replace('https://olivator.cz', '')}`).join('\n')
  const scanMedium = (scan.medium as Array<{ finding_type: string; url: string; detail: string }> ?? [])
    .map((f) => `  🟡 [${f.finding_type}] ${f.detail} — ${f.url.replace('https://olivator.cz', '')}`).join('\n')
  const articleDraftsList = (artDrafts.recent ?? [])
    .map((d) => `  - [${d.status}${d.severity ? ', AI:' + d.severity : ''}] "${d.title}"`).join('\n')

  return `Jsi AI Ředitel olivator.cz — největší srovnávač olivových olejů v ČR.
Piš jako chytrý analytik se znalostí affiliate businessu. Jen fakta, žádné fráze.

━━━ KOMUNIKAČNÍ PRAVIDLA (POVINNÉ — porušení = špatný brief) ━━━

Majitel firmy, pro kterého píšeš, NENÍ ze SEO ani marketingového oboru.
Každá věta musí projít testem: "Pochopil by to kamarád v hospodě bez technického vzdělání?"

ZAKÁZANÉ ZKRATKY a jejich povinné náhrady:
- "CTR" → "z X lidí, kteří nás vidí ve vyhledávání, klikne Y" (uveď konkrétní čísla)
- "impressions" / "imprese" → "kolikrát se web ukázal lidem ve vyhledávání"
- "avg pozice" / "average position" → "Google nás ukazuje průměrně na X. místě (první stránka = top 10)"
- "striking distance" → "stránky těsně pod špičkou Googlu — malý posun = hodně návštěv navíc"
- "offers bez affiliate URL" → "nabídky, ze kterých nedostáváme provizi za nákup"
- "LRU", "cache", technické termíny → vůbec nepoužívat, popsat jen efekt
- "cultivar", "entity", "recentBrandSlugs" → nikdy, to jsou věci pro programátora, ne majitele
- "SEO juice", "crawl", "canonical" → nepsat, nebo lidsky: "jak Google vidí stránku"

KAŽDÉ ČÍSLO potřebuje kontext "co to pro mě znamená":
ŠPATNĚ: "GSC: 13 kliků, 92 impresí, CTR 14%"
DOBŘE: "Z Googlu přišlo 13 lidí za týden. Web se lidem ukázal 92×, ale většina klikla jinam — proto navrhuju akci č. 2."

ROZHODNUTÍ formuluj jako pro majitele firmy, ne pro technika:
ŠPATNĚ: "Doplnit affiliate URL na top 20 produktů dle kliků"
DOBŘE: "20 nejklikanějších produktů teď nevydělávají ani korunu, protože chybí provizní odkaz. Oprava = z každého nákupu přes tyto produkty dostaneme 5–8 %."

TON: zkušený ředitel reportuje majiteli u kávy — srozumitelně, věcně, bez povýšenosti.
Technický termín NUTNÝ v názvu akce? Přidej závorku: "Affiliate URL (provizní odkaz do e-shopu)".

━━━ DATA TÝDNE ${weekLabel} ━━━

GSC (posledních 7 dní):
  Kliky: ${gsc.available ? gsc.totalClicks : 'N/A'} | Imprese: ${gsc.available ? gsc.totalImpressions : 'N/A'} | Avg pozice: ${gsc.available ? Number(gsc.avgPosition ?? 0).toFixed(1) : 'N/A'}
  Top stránky (kliky):
${topPages || '  (žádná data)'}

Katalog:
  Aktivních: ${catalog.activeProducts} | Draftů: ${catalog.draftProducts} | Avg score: ${catalog.avgScore}
  Score distribuce: ${scoreD.topTier ?? 0}× 85+ | ${scoreD.midTier ?? 0}× 70–84 | ${scoreD.lowTier ?? 0}× <70

Affiliate:
  Kliků tento týden: ${affiliate.totalClicks}
  Nabídky BEZ affiliate URL: ${affiliate.offersWithoutAffiliate} celkem
    → Opravitelné Executorem (retailer má eHUB tracking): ${affBreakdown.fixable ?? 0}
    → Bez affiliate programu (nelze monetizovat bez nové dohody): ${affBreakdown.noProgram ?? 0}
  DŮLEŽITÉ: jen "opravitelné" = ztracený revenue k okamžité akci. "Bez programu" = nutno navázat partnerství s retailerem.
  Top produkty:
${topProducts || '  (žádné kliky)'}
  Top retaileři:
${topRetailers || '  (žádné kliky)'}
  Zdroje kliků (kde na webu se kliká nejčastěji — 'product' = produktová karta, 'zebricek' = žebříček, 'clanek' = článek/recept, 'email' = newsletter):
${sourceBreakdownStr}

Newsletter:
  Odběratelé (confirmed): ${newsletter.subscribers}
  Čeká na odeslání: ${newsletter.pendingDrafts} draft(ů)
  Poslední drafty:
${lastDrafts || '  (žádné)'}

AI Article Drafty (čeká na review v /admin/article-drafts):
  K revizi: ${artDrafts.pendingCount ?? 0}
${articleDraftsList || '  (žádné nové)'}

Nevyřízená rozhodnutí z minulých briefů: ${pending.count ?? 0}
${pendingItems ? pendingItems : '  (žádná)'}

Paměť lekcí: ${ls.totalApplications ?? 0} aplikací, ${ls.openPatternsAboveThreshold ?? 0} otevřených patternů

Poslední Git commity:
${lastCommits || '  (nedostupné)'}

🔔 Hlídání cen (Price Watch):
${(() => {
  const pw = raw.priceWatch as { totalActive?: number; newThisWeek?: number; notificationsThisWeek?: number; topWatched?: Array<{ name: string; watches: number }> }
  const total = pw.totalActive ?? 0
  const newW = pw.newThisWeek ?? 0
  const notif = pw.notificationsThisWeek ?? 0
  const top = (pw.topWatched ?? [])
  if (total === 0) return '  Zatím žádná aktivní hlídání.'
  const topStr = top.length > 0
    ? top.map(t => `${t.name} (${t.watches}×)`).join(', ')
    : '(žádné)'
  return `  Celkem aktivních hlídání: ${total} | Nová tento týden: ${newW} | Notifikace odesláno: ${notif}\n  Nejhlídanější: ${topStr}`
})()}

🔍 Co jsem našel na webu (Site Scanner, otevřené nálezy: ${scan.total ?? 0}):
${scanHigh || '  (žádné high-severity nálezy)'}
${scanMedium || '  (žádné medium-severity nálezy)'}

━━━ LEKCE K POUŽITÍ ━━━
${learningSummary || '(žádné relevantní lekce)'}

━━━ INSTRUKCE ━━━
Olivator vydělává VÝHRADNĚ affiliate komisemi (3–15% dle retailera).
Revenue cesta: affiliate klik → retailer → nákup → provize.
Hlavní problémy: 490 nabídek bez affiliate URL, 8 GSC kliků (malý web), 5 subscribers.

Vygeneruj KOMPLETNÍ JSON brief (striktně valid JSON, ŽÁDNÉ markdown code blocks):
{
  "tldr": "Tento týden: [1 věta co je nejdůležitější — konkrétní číslo nebo akce] + [N akcí čeká na tebe]",
  "stav": {
    "summary": "2 věty max: co funguje a co je kritické",
    "metrics": [
      {"label": "Affiliate kliky (7d)", "value": X, "unit": "kliků", "note": "kontextová poznámka"},
      {"label": "GSC kliky (7d)", "value": X, "unit": "kliků", "note": "avg pozice X.X"},
      {"label": "Nabídky bez affiliate", "value": X, "unit": "nabídek", "note": "X% z aktivních"},
      {"label": "Newsletter subscribers", "value": X, "note": "confirmed"}
    ]
  },
  "ceka": [
    "Konkrétní věc čekající na akci admina (ne rozhodnutí, ale úkol)",
    "..."
  ],
  "nasel": [
    "Nejpalčivější nález č.1 — konkrétní čísla",
    "Nejpalčivější nález č.2 — konkrétní čísla",
    "Nejpalčivější nález č.3 — konkrétní čísla"
  ],
  "posun": "• Odrážka 1 — co se posunulo (1 věta)\n• Odrážka 2 — commity / změny (1 věta)\n• Odrážka 3 — trend (1 věta)",
  "rozhodnuti": [
    {
      "key": "kebab-klic",
      "title": "Max 60 znaků",
      "context": "Proč teď? Co říkají data přesně? (2–3 věty s čísly)",
      "roi": "Konkrétní odhad přínosu: 'X kliků → ~Y Kč/měs' nebo '% nárůst'",
      "cas": "Realistický odhad: '30 minut', '2–3 hodiny', '1 den'",
      "options": [
        {"label": "ANO", "description": "Přesně co se udělá", "impact": "Měřitelný dopad"},
        {"label": "NE", "description": "Co se nestane / alternativa", "impact": "Co promarníme"},
        {"label": "ODLOŽIT", "description": "Podmínky pro odložení", "impact": "Risk čekání"}
      ],
      "recommended_option": "ANO",
      "priority": "high",
      "category": "affiliate",
      "learning_applied": "L-XXX nebo null",
      "executor_rule": "fix_affiliate_url"
    }
  ],
  "pamet": {
    "learnings_used": ["L-001", "L-005"],
    "patterns_noted": [
      "Pattern pozorovaný v datech hodný sledování"
    ]
  }
}

PRAVIDLA:
- tldr: přesně 1 věta + "X akcí čeká" — skenovatelné za 5 sekund
- stav.metrics: přesně 4 položky v tomto pořadí (affiliate kliky, GSC kliky, nabídky bez affiliate, subscribers)
- nasel: přesně 3 body, jen nejpalčivější — žádná nízko-prioritní pozorování
- posun: přesně 3 odrážky (•), každá max 1 věta
- rozhodnuti: přesně 5, seřaď high → medium → low, každé s ROI a čas
- Pokud jsi použil lekci z LEKCE K POUŽITÍ sekce, uveď její kód v learning_applied.
- options.label: použij VÝHRADNĚ přesně tyto tři řetězce: "ANO", "NE", "ODLOŽIT". Žádná jiná slova, žádné cizí jazyky.
- recommended_option musí být jedno z: "ANO", "NE", "ODLOŽIT".
- affiliate nabídky: rozlišuj "opravitelné Executorem" (retailer má eHUB tracking) vs. "bez affiliate programu". Celkové číslo bez affiliate neznamená ztracený revenue — většina jsou retaileři bez affiliate programu (viz L-010).
- executor_rule: pokud kategorie="affiliate" a chceš spustit opravu affiliate URL, uveď "fix_affiliate_url". Pokud kategorie="catalog" nebo "katalog" nebo "product" a chceš přepočítat skóre, uveď "recalc_score". Ve všech ostatních případech uveď null. NIKDY nevymýšlej jiné hodnoty — executor_rule smí být VÝHRADNĚ: "fix_affiliate_url", "recalc_score", nebo null.`
}



// ── AI generation + token tracking ───────────────────────────────────────────

async function generateBriefJson(
  raw: RawBriefData,
  weekLabel: string,
  learningSummary: string,
  testFailOpen = false
): Promise<{ json: BriefJson | null; tokenUsage: TokenUsage }> {
  const t0 = Date.now()
  const prompt = buildPrompt(raw, weekLabel, learningSummary)
  try {
    if (testFailOpen) {
      throw new Error('TEST_FAIL_OPEN: intentional failure for testing graceful degradation')
    }
    const response = await callClaude({
      model: MODEL,
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    })

    const generationMs = Date.now() - t0
    const usage = response.usage
    const tokenUsage: TokenUsage = {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      estimatedCostUsd: usage.input_tokens * COST_PER_INPUT_TOKEN + usage.output_tokens * COST_PER_OUTPUT_TOKEN,
      generationMs,
    }

    const text = extractText(response).trim()
    console.log(`[executive-director] Raw response length: ${text.length} chars, stop_reason: ${response.stop_reason}`)
    if (response.stop_reason === 'max_tokens') {
      console.warn('[executive-director] ⚠️  Response hit max_tokens — JSON pravděpodobně zkrácen')
    }
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error('No JSON in response')
    const json = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as BriefJson
    return { json, tokenUsage }
  } catch (err) {
    console.error('[executive-director] AI generation failed:', err)
    return {
      json: null,
      tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, generationMs: Date.now() - t0 },
    }
  }
}

// ── Price Watch statistiky ────────────────────────────────────────────────────
async function collectPriceWatch(): Promise<object> {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalRes, newRes, notifiedRes, topRes] = await Promise.all([
    // Celkem aktivních a potvrzených hlídání
    supabaseAdmin
      .from('price_watches')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .eq('confirmed', true),
    // Nová hlídání za posledních 7 dní
    supabaseAdmin
      .from('price_watches')
      .select('*', { count: 'exact', head: true })
      .eq('confirmed', true)
      .gte('created_at', since7d),
    // Notifikace odeslané za posledních 7 dní (last_notified_at updatováno)
    supabaseAdmin
      .from('price_watches')
      .select('*', { count: 'exact', head: true })
      .gte('last_notified_at', since7d),
    // Top 3 nejhlídanější produkty
    supabaseAdmin
      .from('price_watches')
      .select('product_id, products(name, slug)')
      .eq('active', true)
      .eq('confirmed', true)
      .limit(200),
  ])

  // Agregace top produktů
  const watchCounts = new Map<string, { name: string; slug: string; count: number }>()
  for (const row of (topRes.data ?? []) as unknown as Array<{ product_id: string; products: { name: string; slug: string } | null }>) {
    if (!row.products) continue
    const key = row.product_id
    const entry = watchCounts.get(key) ?? { name: row.products.name, slug: row.products.slug, count: 0 }
    entry.count++
    watchCounts.set(key, entry)
  }
  const topWatched = Array.from(watchCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(w => ({ name: w.name, slug: w.slug, watches: w.count }))

  return {
    totalActive: totalRes.count ?? 0,
    newThisWeek: newRes.count ?? 0,
    notificationsThisWeek: notifiedRes.count ?? 0,
    topWatched,
  }
}

// ── Orchestrátor ──────────────────────────────────────────────────────────────

function getWeekLabel(): { weekLabel: string; weekStart: Date } {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  const year = monday.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const weekNum = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return {
    weekLabel: `${year}-W${String(weekNum).padStart(2, '0')}`,
    weekStart: monday,
  }
}

export async function generateExecutiveBrief(opts: { dryRun?: boolean; testFailOpen?: boolean } = {}): Promise<GenerateBriefResult> {
  const { weekLabel, weekStart } = getWeekLabel()
  console.log(`[executive-director] Generuji brief ${weekLabel}${opts.dryRun ? ' (DRY-RUN)' : ''}${opts.testFailOpen ? ' (TEST-FAILOPEN)' : ''}...`)

  // 12 zdrojů dat paralelně
  const [gsc, catalog, affiliate, newsletter, crons, git, pendingDecisions, learningStats, scanFindings, articleDrafts, autonomousActions, priceWatch] = await Promise.all([
    collectGsc().catch((e) => ({ error: (e as Error).message })),
    collectCatalog().catch((e) => ({ error: (e as Error).message })),
    collectAffiliate().catch((e) => ({ error: (e as Error).message })),
    collectNewsletter().catch((e) => ({ error: (e as Error).message })),
    collectCronStatus().catch((e) => ({ error: (e as Error).message })),
    collectGit().catch((e) => ({ error: (e as Error).message })),
    collectPendingDecisions().catch((e) => ({ error: (e as Error).message })),
    collectLearningStats().catch((e) => ({ error: (e as Error).message })),
    collectScanFindings().catch((e) => ({ error: (e as Error).message })),
    collectArticleDrafts().catch((e) => ({ error: (e as Error).message })),
    collectAutonomousActions().catch((e) => ({ error: (e as Error).message })),
    collectPriceWatch().catch((e) => ({ error: (e as Error).message })),
  ])

  const rawData: RawBriefData = { gsc, catalog, affiliate, newsletter, crons, git, pendingDecisions, learningStats, scanFindings, articleDrafts, autonomousActions, priceWatch }
  console.log('[executive-director] Data sesbírána')

  // Learning Memory Layer — inject relevantní lekce do promptu
  let learningSummary = ''
  let relevantLearningIds: string[] = []
  try {
    const learnings = await getRelevantLearnings({
      keywords: ['newsletter', 'affiliate', 'affiliate-url', 'metrics', 'seo', 'content', 'scraper', 'token'],
      limit: 7,
    })
    relevantLearningIds = learnings.map((l) => l.id)
    learningSummary = learnings.length > 0 ? formatLearningsForPrompt(learnings) : ''
    if (learnings.length > 0) {
      console.log(`[executive-director] Learning Memory: injektováno ${learnings.length} lekcí`)
    }
  } catch (err) {
    console.warn('[executive-director] Learning Memory load failed (non-fatal):', (err as Error).message)
  }

  console.log('[executive-director] Volám Sonnet...')
  const { json: briefJson, tokenUsage } = await generateBriefJson(rawData, weekLabel, learningSummary, opts.testFailOpen)

  if (tokenUsage.inputTokens > 0) {
    console.log(`[executive-director] Tokeny: ${tokenUsage.inputTokens} in + ${tokenUsage.outputTokens} out = ~$${tokenUsage.estimatedCostUsd.toFixed(4)} USD`)
    console.log(`[executive-director] Generace trvala ${tokenUsage.generationMs}ms`)
  }

  // recordApplication pro použité lekce (fire-and-forget)
  if (briefJson && relevantLearningIds.length > 0) {
    const usedCodes = briefJson.pamet?.learnings_used ?? []
    // Zapiš aplikaci pro každou lekci, jejíž kód Sonnet zmínil
    for (const learningId of relevantLearningIds) {
      // Musíme namapovat kód → id (z getRelevantLearnings výstupu jsme uložili jen ids)
      // Jednodušší: zapiš pro všechny injektované (Sonnet je četl, i když je nevyjmenoval)
      recordApplication({
        learningId,
        agentName: 'executive-director',
        context: `Weekly brief ${weekLabel}`,
        decisionMade: usedCodes.length > 0 ? `Použité kódy: ${usedCodes.join(', ')}` : 'Lekce injektovány, žádné explicitně citovány',
      }).catch((e) => console.warn('[executive-director] recordApplication failed:', e))
    }
  }

  // Připoj systemTyden sekci z agent_decisions (deterministická, ne AI)
  if (briefJson) {
    briefJson.systemTyden = buildSystemSection(rawData.autonomousActions)
  }

  if (opts.dryRun) {
    console.log('\n════════════════════════════════════════')
    console.log('DRY-RUN: RAW DATA')
    console.log('════════════════════════════════════════')
    console.log(JSON.stringify(rawData, null, 2))
    console.log('\n════════════════════════════════════════')
    console.log('DRY-RUN: BRIEF JSON')
    console.log('════════════════════════════════════════')
    console.log(briefJson ? JSON.stringify(briefJson, null, 2) : '(AI generation failed — viz výše)')
    console.log('\n════════════════════════════════════════')
    console.log('🤖 SYSTÉM TENTO TÝDEN')
    console.log('════════════════════════════════════════')
    console.log(briefJson?.systemTyden ?? '(žádná data)')
    console.log('\n════════════════════════════════════════')
    console.log('DRY-RUN: TOKEN STATS')
    console.log('════════════════════════════════════════')
    console.log(JSON.stringify(tokenUsage, null, 2))
    if (!briefJson) {
      console.log('\n━━━ FAIL-OPEN TEST ━━━')
      console.log('AI generation selhala. V reálném běhu:')
      console.log('- Brief uložen do DB se status="draft" a generation_error=...')
      console.log('- Email NENÍ odeslán (žádný briefId k zobrazení)')
      console.log('- Admin vidí na /admin/brief: "Generace selhala: ..."')
      console.log('- Příští neděle: nový pokus (upsert přepíše stávající řádek)')
    }
    return { briefId: 'dry-run', weekLabel, decisionCount: briefJson?.rozhodnuti?.length ?? 0, rawData, briefJson, tokenUsage }
  }

  // Uložení do DB
  const { data: brief, error: briefErr } = await supabaseAdmin
    .from('weekly_briefs')
    .upsert({
      week_start: weekStart.toISOString().split('T')[0],
      week_label: weekLabel,
      raw_data: rawData as unknown,
      brief_md: briefJson?.stav?.summary ?? null,
      brief_json: briefJson as unknown,
      status: briefJson ? 'ready' : 'draft',
      generation_error: briefJson ? null : 'AI generation failed',
      generated_at: new Date().toISOString(),
    }, { onConflict: 'week_label' })
    .select('id').single()

  if (briefErr || !brief) throw new Error(`Failed to save brief: ${briefErr?.message ?? 'No data'}`)
  const briefId = brief.id as string

  if (briefJson?.rozhodnuti?.length) {
    const VALID_EXECUTOR_RULES = ['fix_affiliate_url', 'recalc_score']
    const rows = briefJson.rozhodnuti.map((d) => ({
      brief_id: briefId,
      decision_key: d.key,
      title: d.title,
      context: d.context,
      options: d.options as unknown,
      recommended_option: d.recommended_option,
      priority: d.priority,
      category: d.category,
      executor_rule: VALID_EXECUTOR_RULES.includes(d.executor_rule ?? '') ? d.executor_rule : null,
    }))
    await supabaseAdmin.from('weekly_decisions').upsert(rows, { onConflict: 'brief_id,decision_key' })
  }

  console.log(`[executive-director] Brief ${weekLabel} uložen (id=${briefId}, decisions=${briefJson?.rozhodnuti?.length ?? 0})`)
  return { briefId, weekLabel, decisionCount: briefJson?.rozhodnuti?.length ?? 0, rawData, briefJson, tokenUsage }
}
