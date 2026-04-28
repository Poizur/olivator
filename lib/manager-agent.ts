// Olivator Manager Agent — týdenní strategický report.
//
// Sbírá data napříč zdroji (affiliate clicks, quality issues, discovery,
// completeness, top/bottom produkty) za uplynulých 7 dní, předá Claude
// k analýze, vrátí 3 příležitosti + 3 problémy + 3 akce. Ukládá do DB
// a posílá emailem.
//
// Cron: pondělí 5:00 UTC (po discovery 4:00 + prospect 4:30).

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'
import { calculateCompleteness } from './completeness'
import type { Product } from './types'

const MODEL = 'claude-sonnet-4-20250514'

export interface SuggestedAction {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: 'seo' | 'content' | 'affiliate' | 'quality' | 'technical'
  completed?: boolean
}

export interface ManagerMetrics {
  // Period
  periodStart: string
  periodEnd: string
  // Affiliate
  totalClicks: number
  clicksByProduct: Array<{ slug: string; name: string; clicks: number }>
  clicksByRetailer: Array<{ name: string; clicks: number }>
  offersWithoutAffiliate: number
  totalOffers: number
  // Discovery
  newCandidatesThisWeek: number
  candidatesPending: number
  // Quality
  openQualityIssues: number
  productsLowCompleteness: number // < 70 %
  // Catalog
  totalActiveProducts: number
  totalDraftProducts: number
  topScoreProducts: Array<{ slug: string; name: string; score: number }>
  bottomScoreProducts: Array<{ slug: string; name: string; score: number }>
}

export interface ManagerReport {
  metrics: ManagerMetrics
  aiAnalysis: string
  suggestedActions: SuggestedAction[]
}

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY missing')
  return new Anthropic({ apiKey: key })
}

interface AffiliateClickRow {
  product_id: string | null
  retailer_id: string | null
}
interface RetailerRow {
  id: string
  name: string
}
interface OfferRow {
  product_id: string
  affiliate_url: string | null
}
interface DiscoveryRow {
  status: string
}

async function gatherMetrics(): Promise<ManagerMetrics> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const periodStart = weekAgo.toISOString().slice(0, 10)
  const periodEnd = now.toISOString().slice(0, 10)

  // ── Affiliate clicks za týden ──
  const { data: clicks } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('product_id, retailer_id')
    .gte('clicked_at', weekAgo.toISOString())
    .returns<AffiliateClickRow[]>()
  const totalClicks = clicks?.length ?? 0

  // Aggregace per produkt
  const clickCountByProduct = new Map<string, number>()
  const clickCountByRetailer = new Map<string, number>()
  for (const c of clicks ?? []) {
    if (c.product_id) {
      clickCountByProduct.set(c.product_id, (clickCountByProduct.get(c.product_id) ?? 0) + 1)
    }
    if (c.retailer_id) {
      clickCountByRetailer.set(c.retailer_id, (clickCountByRetailer.get(c.retailer_id) ?? 0) + 1)
    }
  }

  // Resolve names
  const productIds = [...clickCountByProduct.keys()]
  const { data: clickedProducts } =
    productIds.length > 0
      ? await supabaseAdmin.from('products').select('id, slug, name').in('id', productIds)
      : { data: [] }
  const clicksByProduct = (clickedProducts ?? [])
    .map((p) => ({
      slug: p.slug as string,
      name: p.name as string,
      clicks: clickCountByProduct.get(p.id as string) ?? 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)

  const retailerIds = [...clickCountByRetailer.keys()]
  const { data: clickedRetailers } =
    retailerIds.length > 0
      ? await supabaseAdmin
          .from('retailers')
          .select('id, name')
          .in('id', retailerIds)
          .returns<RetailerRow[]>()
      : { data: [] }
  const clicksByRetailer = (clickedRetailers ?? [])
    .map((r) => ({
      name: r.name,
      clicks: clickCountByRetailer.get(r.id) ?? 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)

  // ── Offers bez affiliate URL ──
  const { data: allOffers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, affiliate_url')
    .returns<OfferRow[]>()
  const offersWithoutAffiliate = (allOffers ?? []).filter((o) => !o.affiliate_url).length
  const totalOffers = allOffers?.length ?? 0

  // ── Discovery ──
  const { data: candidates } = await supabaseAdmin
    .from('discovery_candidates')
    .select('status')
    .gte('created_at', weekAgo.toISOString())
    .returns<DiscoveryRow[]>()
  const newCandidatesThisWeek = candidates?.length ?? 0
  const { count: candidatesPendingCount } = await supabaseAdmin
    .from('discovery_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'needs_review')
  const candidatesPending = candidatesPendingCount ?? 0

  // ── Quality issues open ──
  const { count: openQualityIssuesCount } = await supabaseAdmin
    .from('quality_issues')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'resolved')
  const openQualityIssues = openQualityIssuesCount ?? 0

  // ── Catalog state + completeness ──
  const { data: allProductsRaw, error: pErr } = await supabaseAdmin
    .from('products')
    .select('*')
  if (pErr) throw pErr
  const activeProducts = (allProductsRaw ?? []).filter((p) => p.status === 'active')
  const totalActiveProducts = activeProducts.length
  const totalDraftProducts = (allProductsRaw ?? []).filter((p) => p.status === 'draft').length

  // Productů pod 70 % completeness — mapovat row → Product type pro calculateCompleteness
  // Ale Product type vyžaduje plnou strukturu; zde zjednodušuji s heuristikou stejnou jako completeness
  const productsLowCompleteness = activeProducts.filter((p) => {
    const desc = String(p.description_long ?? '')
    const hasName = !!(p.name && p.name.length > 5)
    const hasEan = !!(p.ean && p.ean.length >= 8)
    const hasImage = !!p.image_url
    const hasAcidity = p.acidity != null
    const hasPolyphenols = p.polyphenols != null
    const hasOrigin = !!p.origin_country
    const hasType = !!p.type
    const hasVolume = (p.volume_ml ?? 0) > 0
    const hasCerts = Array.isArray(p.certifications) && p.certifications.length > 0
    const hasMeta = !!(p.meta_description && p.meta_description.length > 50)
    const hasLong = desc.length > 300
    const filled = [
      hasName, hasEan, hasImage, hasAcidity, hasPolyphenols, hasOrigin,
      hasType, hasVolume, hasCerts, hasMeta, hasLong,
    ].filter(Boolean).length
    return filled / 11 < 0.7
  }).length

  // Top 3 by score
  const topScoreProducts = [...activeProducts]
    .sort((a, b) => (b.olivator_score ?? 0) - (a.olivator_score ?? 0))
    .slice(0, 3)
    .map((p) => ({
      slug: p.slug as string,
      name: p.name as string,
      score: (p.olivator_score as number) ?? 0,
    }))
  // Bottom 3 by score (filter nulové score)
  const bottomScoreProducts = [...activeProducts]
    .filter((p) => (p.olivator_score ?? 0) > 0)
    .sort((a, b) => (a.olivator_score ?? 0) - (b.olivator_score ?? 0))
    .slice(0, 3)
    .map((p) => ({
      slug: p.slug as string,
      name: p.name as string,
      score: (p.olivator_score as number) ?? 0,
    }))

  return {
    periodStart,
    periodEnd,
    totalClicks,
    clicksByProduct,
    clicksByRetailer,
    offersWithoutAffiliate,
    totalOffers,
    newCandidatesThisWeek,
    candidatesPending,
    openQualityIssues,
    productsLowCompleteness,
    totalActiveProducts,
    totalDraftProducts,
    topScoreProducts,
    bottomScoreProducts,
  }
}

const SYSTEM_PROMPT = `Jsi strategický manažer Olivator.cz — největšího srovnávače olivových olejů v ČR.
Píšeš týdenní strategický report majiteli (Architektovi).

Tón: konkrétní, datově orientovaný, kamarádský sommelier styl. Wirecutter + Wine Folly.
Žádné generické fráze ("pokračujte v dobré práci"). Pouze konkrétní pozorování + akce.

Dostaneš metriky za uplynulý týden. Vrať JSON ve formátu:

{
  "ai_analysis": "Plain-text shrnutí 4-6 vět. Začni zhodnocením týdne v 1 větě.
                 Pak 2-3 nejdůležitější pozorování s konkrétními čísly.
                 Tón konverzační, ne formální.",
  "actions": [
    {
      "title": "Krátký nadpis akce (max 60 znaků)",
      "description": "1-2 věty co konkrétně udělat. Buď přesný — který produkt, který e-shop, jaký krok.",
      "priority": "high|medium|low",
      "category": "seo|content|affiliate|quality|technical"
    }
  ]
}

Vrať PRESNĚ 3 akce. PrioRity:
- high = mělo by se udělat tento týden, jasný dopad
- medium = do měsíce
- low = nice-to-have

Kategorie:
- seo = title/meta optimalizace, content gaps, GSC akce
- content = nový článek, žebříček, recept, copywriting
- affiliate = doplnit affiliate URL, prozkoumat retailera, EPC optimalizace
- quality = chybějící data, broken images, low-completeness produkty, drafty
- technical = bug fix, deploy, infrastruktura

Pokud chybí data (málo kliků, málo dat) — napiš to upřímně, nedávej vatu.

Vrať POUZE JSON. Žádný úvod ani závěr.`

async function callClaude(metrics: ManagerMetrics): Promise<{
  aiAnalysis: string
  suggestedActions: SuggestedAction[]
}> {
  const client = getClient()
  const userMessage = `Metriky za týden ${metrics.periodStart} až ${metrics.periodEnd}:

KATALOG
- Aktivních produktů: ${metrics.totalActiveProducts}
- Draftů: ${metrics.totalDraftProducts}
- Pod 70 % completeness: ${metrics.productsLowCompleteness}
- Top 3 Score: ${metrics.topScoreProducts.map((p) => `${p.name} (${p.score})`).join(', ')}
- Bottom 3 Score: ${metrics.bottomScoreProducts.map((p) => `${p.name} (${p.score})`).join(', ')}

AFFILIATE
- Celkem kliků za týden: ${metrics.totalClicks}
- Top produkty kliky: ${metrics.clicksByProduct.length === 0 ? 'žádné' : metrics.clicksByProduct.map((p) => `${p.name} (${p.clicks})`).join(', ')}
- Top prodejci kliky: ${metrics.clicksByRetailer.length === 0 ? 'žádní' : metrics.clicksByRetailer.map((r) => `${r.name} (${r.clicks})`).join(', ')}
- Offers bez affiliate URL: ${metrics.offersWithoutAffiliate}/${metrics.totalOffers}

DISCOVERY
- Nové kandidáti tento týden: ${metrics.newCandidatesThisWeek}
- Čeká na schválení: ${metrics.candidatesPending}

QUALITY
- Otevřené quality issues: ${metrics.openQualityIssues}

Vrať JSON s ai_analysis (4-6 vět) + 3 actions.`

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
  const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '').trim()
  const parsed = JSON.parse(cleaned) as {
    ai_analysis?: string
    actions?: SuggestedAction[]
  }
  return {
    aiAnalysis: parsed.ai_analysis ?? '(prázdná analýza)',
    suggestedActions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : [],
  }
}

/** End-to-end: collect metrics → call Claude → save report → return. */
export async function runManagerAgent(): Promise<{
  reportId: string | null
  report: ManagerReport
}> {
  const metrics = await gatherMetrics()
  const { aiAnalysis, suggestedActions } = await callClaude(metrics)

  // Try to save to manager_reports table; gracefully skip if table doesn't exist
  let reportId: string | null = null
  try {
    const { data, error } = await supabaseAdmin
      .from('manager_reports')
      .insert({
        period_start: metrics.periodStart,
        period_end: metrics.periodEnd,
        metrics,
        ai_analysis: aiAnalysis,
        suggested_actions: suggestedActions,
        status: 'sent',
        email_sent_to: process.env.ALERT_EMAIL ?? null,
      })
      .select('id')
      .single()
    if (!error && data) reportId = data.id as string
  } catch (err) {
    console.warn('[manager] save to DB failed (table missing?):', err instanceof Error ? err.message : err)
  }

  return {
    reportId,
    report: { metrics, aiAnalysis, suggestedActions },
  }
}

/** Manual prevent-reuse: typegen for completeness consumer */
export type { Product }
