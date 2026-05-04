// Olivator Radar — orchestrátor pro detekci breaking news o olivovém oleji.
//
// Pipeline:
//   1. Fetch RSS feedů (lib/rss-fetcher.ts) — Olive Oil Times, IOC, Google News
//   2. Filter na BREAKING_SIGNALS (harvest, award, recall, …) v title/desc
//   3. L1 dedup: fingerprint hash vs posledních 7 dní agent_decisions
//   4. L2 dedup: jaccard > 0.55 → Claude Haiku same-story judge
//   5. Pro nové: Haiku překlad title + summary + cz_context + badge
//   6. Upsert do radar_items, log do agent_decisions
//
// Volá se z scripts/cron/radar.ts (Railway cron každé 2 hodiny) nebo
// /api/cron/radar HTTP variant.

import { supabaseAdmin } from './supabase'
import { fetchAllOliveFeeds, type RssItem } from './rss-fetcher'
import { makeFingerprint, jaccard } from './fingerprint'
import { callClaude, extractText } from './anthropic'

// Klíčová slova pro filter — chceme jen zprávy které opravdu hýbou trhem.
// Generic "olive oil" article projde přes RSS, ale bez signal nepublikujeme.
const BREAKING_SIGNALS: ReadonlyArray<string> = [
  'harvest', 'sklizeň', 'sklizen', 'úroda', 'uroda',
  'award', 'ocenění', 'oceneni', 'nyiooc', 'gold', 'silver',
  'recall', 'stažen',
  'certification', 'certifikace', 'dop', 'pgp', 'igp',
  'price', 'cena', 'ceny', 'eur', 'kč',
  'production', 'produkce', 'yield',
  'new release', 'vintage',
  'shortage', 'nedostatek',
  'frost', 'mráz', 'mraz',
  'drought', 'sucho',
  'sklizeň 2025', 'sklizeň 2026', 'harvest 2025', 'harvest 2026',
  'extra virgin', 'evoo',
  'fraud', 'podvod', 'falšov',
  'study', 'výzkum', 'vyzkum', 'health',
]

export interface RadarRunResult {
  feedsFetched: number
  itemsTotal: number
  itemsAfterSignal: number
  itemsAfterUrlDedup: number
  itemsAfterFpDedup: number
  itemsAfterHaikuDedup: number
  itemsAfterRelevanceCheck: number
  itemsSaved: number
  errors: string[]
  startedAt: string
  finishedAt: string
}

interface SeenIndex {
  urls: Set<string>           // exact URL match
  titlesLower: Set<string>    // exact title match
  fingerprints: Map<string, { title: string; url: string }>
  byTitle: Array<{ title: string; fp: string }>  // pro jaccard
}

async function loadSeenIndex(): Promise<SeenIndex> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('agent_decisions')
    .select('payload, fingerprint, created_at')
    .eq('decision_type', 'breaking_news_processed')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(200)

  const idx: SeenIndex = {
    urls: new Set(),
    titlesLower: new Set(),
    fingerprints: new Map(),
    byTitle: [],
  }

  for (const row of data ?? []) {
    const payload = (row.payload as { title?: string; url?: string } | null) ?? {}
    const title = (payload.title ?? '').trim()
    const url = (payload.url ?? '').trim()
    const fp = (row.fingerprint as string | null) ?? ''
    if (url) idx.urls.add(url)
    if (title) idx.titlesLower.add(title.toLowerCase())
    if (fp && !idx.fingerprints.has(fp)) {
      idx.fingerprints.set(fp, { title, url })
    }
    if (title) idx.byTitle.push({ title, fp })
  }
  return idx
}

const HAIKU_SAME_STORY_PROMPT = (a: string, b: string) =>
  `Tyhle dva titulky jsou o stejném reálném eventu?\n\nA: ${a}\nB: ${b}\n\n` +
  `Odpověz POUZE validním JSON, nic jiného:\n` +
  `{"same_story": true|false, "confidence": 0.0-1.0, "reason": "max 80 znaků"}`

async function haikuSameStory(titleA: string, titleB: string): Promise<boolean> {
  try {
    const resp = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'Jsi editor posuzující duplicity breaking news. Stručně, jen JSON.',
      messages: [{ role: 'user', content: HAIKU_SAME_STORY_PROMPT(titleA, titleB) }],
    })
    const raw = extractText(resp).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    const data = JSON.parse(raw) as { same_story?: boolean; confidence?: number }
    return Boolean(data.same_story) && (data.confidence ?? 0) >= 0.8
  } catch {
    return false  // konzervativně: neshazujeme kandidáta při chybě
  }
}

interface TranslationResult {
  czechTitle: string
  czechSummary: string
  czContext: string
  badge: string
  isRelevant: boolean
}

const TRANSLATION_PROMPT = (source: string, title: string, description: string) =>
  `Jsi redaktor Olivator.cz — největšího srovnávače olivových olejů v ČR.\n\n` +
  `Dostaneš zprávu ze světového tisku o olivovém oleji.\n` +
  `Přelož a lokalizuj ji pro české čtenáře.\n\n` +
  `Výstup POUZE validní JSON, žádné backticks:\n` +
  `{\n` +
  `  "czech_title": "Nadpis česky, max 80 znaků, konkrétní a informativní",\n` +
  `  "czech_summary": "Dvě věty česky — co se stalo a proč je to důležité",\n` +
  `  "cz_context": "Jedna věta — co to znamená pro ceny nebo dostupnost olivového oleje v ČR",\n` +
  `  "badge": "harvest|price|award|science|quality|news",\n` +
  `  "is_relevant": true\n` +
  `}\n\n` +
  `Pokud zpráva nesouvisí s olivovým olejem (jen okrajová zmínka, jiné téma):\n` +
  `{"is_relevant": false}\n\n` +
  `Nepoužívej marketingové fráze. Buď konkrétní — čísla, procenta, země.\n\n` +
  `Zpráva:\n` +
  `Zdroj: ${source}\n` +
  `Titulek: ${title}\n` +
  `Popis: ${description}`

async function translateAndLocalize(item: RssItem): Promise<TranslationResult | null> {
  try {
    const resp = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: 'Jsi redaktor olivator.cz. Vracíš jen validní JSON.',
      messages: [{ role: 'user', content: TRANSLATION_PROMPT(item.source, item.title, item.description) }],
    })
    const raw = extractText(resp).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    const data = JSON.parse(raw) as Partial<{
      czech_title: string
      czech_summary: string
      cz_context: string
      badge: string
      is_relevant: boolean
    }>
    if (data.is_relevant === false) {
      return { czechTitle: '', czechSummary: '', czContext: '', badge: 'news', isRelevant: false }
    }
    return {
      czechTitle: (data.czech_title ?? item.title).slice(0, 200),
      czechSummary: data.czech_summary ?? '',
      czContext: data.cz_context ?? '',
      badge: data.badge ?? 'news',
      isRelevant: true,
    }
  } catch (err) {
    console.warn(`[radar] translation failed for "${item.title.slice(0, 50)}":`, err instanceof Error ? err.message : err)
    return null
  }
}

const ALLOWED_BADGES = new Set(['harvest', 'price', 'award', 'science', 'quality', 'news'])

export async function runRadarAgent(opts: { hoursBack?: number; maxItems?: number } = {}): Promise<RadarRunResult> {
  const startedAt = new Date().toISOString()
  const hoursBack = opts.hoursBack ?? 4
  const maxItems = opts.maxItems ?? 5  // strop kolik nových zpráv za run

  const result: RadarRunResult = {
    feedsFetched: 0,
    itemsTotal: 0,
    itemsAfterSignal: 0,
    itemsAfterUrlDedup: 0,
    itemsAfterFpDedup: 0,
    itemsAfterHaikuDedup: 0,
    itemsAfterRelevanceCheck: 0,
    itemsSaved: 0,
    errors: [],
    startedAt,
    finishedAt: '',
  }

  const seen = await loadSeenIndex()
  const items = await fetchAllOliveFeeds(hoursBack)
  result.itemsTotal = items.length

  // Filter na breaking signals
  const signaled = items.filter((it) => {
    const text = (it.title + ' ' + it.description).toLowerCase()
    return BREAKING_SIGNALS.some((sig) => text.includes(sig))
  })
  result.itemsAfterSignal = signaled.length

  // URL / title exact dedup
  const afterUrlDedup = signaled.filter((it) => {
    if (seen.urls.has(it.url)) return false
    if (seen.titlesLower.has(it.title.toLowerCase())) return false
    return true
  })
  result.itemsAfterUrlDedup = afterUrlDedup.length

  // L1: fingerprint dedup
  const candidates: Array<RssItem & { fingerprint: string }> = []
  for (const it of afterUrlDedup) {
    const fp = makeFingerprint(it.title, it.description)
    if (seen.fingerprints.has(fp)) continue
    candidates.push({ ...it, fingerprint: fp })
    // Intra-run dedup
    seen.fingerprints.set(fp, { title: it.title, url: it.url })
  }
  result.itemsAfterFpDedup = candidates.length

  // L2: Haiku same-story arbiter pro near-duplicates
  const afterHaiku: typeof candidates = []
  for (const cand of candidates) {
    let near: { title: string } | null = null
    for (const prev of seen.byTitle.slice(0, 50)) {
      if (jaccard(cand.title, prev.title) >= 0.55) {
        near = { title: prev.title }
        break
      }
    }
    if (near) {
      const sameStory = await haikuSameStory(cand.title, near.title)
      if (sameStory) continue
    }
    afterHaiku.push(cand)
    seen.byTitle.unshift({ title: cand.title, fp: cand.fingerprint })
  }
  result.itemsAfterHaikuDedup = afterHaiku.length

  // Sort by freshness, take top N
  afterHaiku.sort((a, b) => b.freshness - a.freshness)
  const topItems = afterHaiku.slice(0, maxItems)

  // Translate + save
  for (const item of topItems) {
    const translation = await translateAndLocalize(item)
    if (!translation) {
      result.errors.push(`translate failed: ${item.title.slice(0, 50)}`)
      continue
    }
    if (!translation.isRelevant) {
      // Item není o olivovém oleji — Haiku rozhodl. Nepublikovat.
      continue
    }
    result.itemsAfterRelevanceCheck++

    const badge = ALLOWED_BADGES.has(translation.badge) ? translation.badge : 'news'

    // Upsert do radar_items (UNIQUE original_url)
    const { error: upsertErr } = await supabaseAdmin
      .from('radar_items')
      .upsert(
        {
          source: item.source,
          original_url: item.url,
          original_title: item.title,
          czech_title: translation.czechTitle,
          czech_summary: translation.czechSummary,
          cz_context: translation.czContext,
          badge,
          fingerprint: item.fingerprint,
          published_at: (item.pubDate ?? new Date()).toISOString(),
          is_published: true,
        },
        { onConflict: 'original_url' }
      )
    if (upsertErr) {
      result.errors.push(`upsert: ${upsertErr.message}`)
      continue
    }

    // Log do agent_decisions pro 7-day window dedup history
    await supabaseAdmin.from('agent_decisions').insert({
      agent_name: 'radar_agent',
      decision_type: 'breaking_news_processed',
      payload: { title: item.title, url: item.url, badge },
      fingerprint: item.fingerprint,
    })

    result.itemsSaved++
    console.log(`[radar] saved ${badge}: ${translation.czechTitle.slice(0, 60)}`)
  }

  result.finishedAt = new Date().toISOString()
  return result
}
