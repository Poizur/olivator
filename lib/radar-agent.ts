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
import { fetchArticleText } from './article-fetcher'
import { searchUnsplash } from './unsplash'
import { slugify } from './utils'

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
  'mediterranean', 'polyphenol', 'antioxidant',
  'competition', 'festival', 'fair',
  'quality', 'premium', 'organic', 'bio',
  'import', 'export', 'market', 'trh',
  'oleic', 'acidity', 'kyselost',
  'spain', 'italy', 'greece', 'croatia', 'řecko', 'itálie', 'španělsko', 'chorvatsko',
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
  czechArticle: string
  czContext: string
  badge: string
  countryCode: string | null
  metaTitle: string
  metaDescription: string
  unsplashQuery: string
  isRelevant: boolean
}

const TRANSLATION_PROMPT = (source: string, title: string, description: string, fullText: string | null) =>
  `Jsi redaktor Olivator.cz — největšího srovnávače olivových olejů v ČR.\n\n` +
  `Dostal jsi zahraniční zprávu o olivovém oleji. Napiš z ní český článek pro\n` +
  `naše čtenáře — kteří neumí anglicky a chtějí pochopit co se děje a proč.\n\n` +
  `Výstup POUZE validní JSON, žádné backticks:\n` +
  `{\n` +
  `  "czech_title": "Nadpis česky, max 80 znaků, konkrétní (čísla, místo, dopad)",\n` +
  `  "czech_summary": "2-3 věty — stručné shrnutí pro listing card",\n` +
  `  "czech_article": "Plnohodnotný článek 350-600 slov ve 4-6 odstavcích, oddělené \\n\\n. První odstavec = lead (kdo, co, kdy, kde). Další odstavce = kontext, čísla, citace, pozadí. Poslední odstavec = co to znamená pro českého spotřebitele/trh. Piš česky, plynule, novinářsky — ne jen překlad. Žádné marketingové fráze.",\n` +
  `  "cz_context": "1 věta — konkrétní dopad na české ceny/dostupnost",\n` +
  `  "badge": "harvest|price|award|science|quality|news",\n` +
  `  "country_code": "Primární země článku — ISO kód: GR|IT|ES|HR|PT|TN|TR|US|MA|IL — nebo 'XX' (více zemí/global) nebo null (nezjistitelné)",\n` +
  `  "meta_title": "SEO title, max 60 znaků, klíčové slovo na začátku",\n` +
  `  "meta_description": "SEO description, 140-160 znaků, vysvětlení + benefit pro čtenáře",\n` +
  `  "unsplash_query": "Topic-specific anglicky 3-5 slov pro hero foto — KONKRÉTNĚ k článku, ne 'olive oil'. Příklady: 'olive harvest greece tractor', 'mediterranean olive grove sunset', 'olive oil bottling factory'",\n` +
  `  "is_relevant": true\n` +
  `}\n\n` +
  `Pokud zpráva nesouvisí s olivovým olejem: {"is_relevant": false}\n\n` +
  `Pravidla pro článek:\n` +
  `- Piš novinářsky: aktivní hlas, konkrétní čísla, jména, místa\n` +
  `- Pokud zdroj má citace, přelož je v uvozovkách s atribucí\n` +
  `- Vyhni se "podle zdroje", "uvádí článek" — piš jako bys to věděl sám\n` +
  `- Český kontext patří JEN do cz_context a posledního odstavce, ne do leadu\n\n` +
  `ZAKÁZANÁ SLOVA A CHYBY (kritická pravidla češtiny):\n` +
  `- "olivární" NEEXISTUJE — piš "olivový", "olivářský" nebo "výrobci olivového oleje"\n` +
  `- "Řecka slaví/radují/dominují" — "Řecka" je genitiv státu, ne množné číslo lidí. Piš "Řečtí producenti", "řečtí oliváři", "výrobci z Řecka"\n` +
  `- "celosvětová soutěž" — příliš vágní. Piš konkrétní název: NYIOOC, World Olive Oil Competition atd.\n` +
  `- "Puljský/Puljská" — správně "apulský/apulská" (Puglia = Apulie česky)\n` +
  `- ŽÁDNÉ cyrilické znaky — pouze latinika s háčky a čárkami\n` +
  `- ŽÁDNÉ marketingové fráze: "prémiový zážitek", "expanzivně rozrůstá", "rostoucí povědomí"\n\n` +
  `Zpráva:\n` +
  `Zdroj: ${source}\n` +
  `Titulek: ${title}\n` +
  `Krátký popis: ${description}\n\n` +
  (fullText
    ? `Plný text článku (z webu zdroje):\n${fullText}`
    : `UPOZORNĚNÍ: Plný text se nepodařilo stáhnout. Máš k dispozici POUZE titulek a krátký popis.\n` +
      `PRAVIDLA PRO TENTO PŘÍPAD:\n` +
      `- Piš POUZE to, co lze odvodit z titulku a popisu — žádné spekulace\n` +
      `- NEUVÁDĚJ konkrétní jména producentů, počty medailí ani čísla která neznáš\n` +
      `- Kontext a pozadí (region, soutěž, trendy) je OK pokud je obecně znám\n` +
      `- Použij SPRÁVNÉ české názvy: Puglia = "Apulie", adjektivum "apulský/apulská"\n` +
      `- Pokud nelze napsat alespoň 3 faktické odstavce, vrať is_relevant: false\n` +
      `- ABSOLUTNĚ ŽÁDNÁ cyrilická písmena — pouze latina s háčky a čárkami`)

async function translateAndLocalize(item: RssItem, fullText: string | null): Promise<TranslationResult | null> {
  try {
    const resp = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      system: 'Jsi redaktor olivator.cz. Píšeš česky, novinářsky, věcně. Vracíš jen validní JSON.',
      messages: [{ role: 'user', content: TRANSLATION_PROMPT(item.source, item.title, item.description, fullText) }],
    })
    const raw = extractText(resp).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    const data = JSON.parse(raw) as Partial<{
      czech_title: string
      czech_summary: string
      czech_article: string
      cz_context: string
      badge: string
      country_code: string | null
      meta_title: string
      meta_description: string
      unsplash_query: string
      is_relevant: boolean
    }>
    if (data.is_relevant === false) {
      return {
        czechTitle: '', czechSummary: '', czechArticle: '', czContext: '',
        badge: 'news', countryCode: null, metaTitle: '', metaDescription: '', unsplashQuery: '',
        isRelevant: false,
      }
    }
    const VALID_COUNTRIES = new Set(['GR','IT','ES','HR','PT','TN','TR','US','MA','IL','XX'])
    const rawCountry = (data.country_code ?? '').toUpperCase()
    return {
      czechTitle: (data.czech_title ?? item.title).slice(0, 200),
      czechSummary: data.czech_summary ?? '',
      czechArticle: data.czech_article ?? '',
      czContext: data.cz_context ?? '',
      badge: data.badge ?? 'news',
      countryCode: VALID_COUNTRIES.has(rawCountry) ? rawCountry : null,
      metaTitle: (data.meta_title ?? data.czech_title ?? '').slice(0, 70),
      metaDescription: (data.meta_description ?? data.czech_summary ?? '').slice(0, 200),
      unsplashQuery: data.unsplash_query ?? 'olive oil mediterranean',
      isRelevant: true,
    }
  } catch (err) {
    console.warn(`[radar] translation failed for "${item.title.slice(0, 50)}":`, err instanceof Error ? err.message : err)
    return null
  }
}

interface HeroImage {
  url: string
  alt: string
  attribution: string
  sourceUrl: string
}

async function fetchHeroImage(query: string, fallbackAlt: string): Promise<HeroImage | null> {
  try {
    const photos = await searchUnsplash(query, 1)
    const p = photos[0]
    if (!p) return null
    return {
      url: p.url,
      alt: p.altText || fallbackAlt,
      attribution: p.attribution,
      sourceUrl: p.sourceUrl,
    }
  } catch (err) {
    console.warn(`[radar] unsplash failed for "${query}":`, err instanceof Error ? err.message : err)
    return null
  }
}

async function generateUniqueSlug(czechTitle: string, currentId?: string): Promise<string> {
  const base = slugify(czechTitle).slice(0, 80) || 'novinka'
  let candidate = base
  let n = 2
  while (n < 50) {
    const { data } = await supabaseAdmin
      .from('radar_items')
      .select('id')
      .eq('slug', candidate)
      .limit(1)
    const conflict = (data ?? []).find(r => r.id !== currentId)
    if (!conflict) return candidate
    candidate = `${base}-${n}`
    n++
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`
}

const ALLOWED_BADGES = new Set(['harvest', 'price', 'award', 'science', 'quality', 'news'])

export async function runRadarAgent(opts: { hoursBack?: number; maxItems?: number } = {}): Promise<RadarRunResult> {
  const startedAt = new Date().toISOString()
  const hoursBack = opts.hoursBack ?? 168
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

  // Filter na breaking signals — log per-feed pro diagnostiku
  const byFeed = new Map<string, { total: number; passed: number }>()
  const signaled = items.filter((it) => {
    const entry = byFeed.get(it.source) ?? { total: 0, passed: 0 }
    entry.total++
    const text = (it.title + ' ' + it.description).toLowerCase()
    const pass = BREAKING_SIGNALS.some((sig) => text.includes(sig))
    if (pass) entry.passed++
    byFeed.set(it.source, entry)
    return pass
  })
  for (const [src, { total, passed }] of byFeed) {
    console.log(`[radar] signal filter: ${src} ${passed}/${total}`)
  }
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
    // Stáhni full article text z originálu (best effort, ~8s timeout)
    const fullText = await fetchArticleText(item.url)

    const translation = await translateAndLocalize(item, fullText)
    if (!translation) {
      result.errors.push(`translate failed: ${item.title.slice(0, 50)}`)
      continue
    }
    if (!translation.isRelevant) {
      // Item není o olivovém oleji — Haiku rozhodl. Nepublikovat.
      continue
    }

    // Quality gate: bez fullText + příliš krátký článek = nepublikovat automaticky
    // Zachráníme do DB jako draft (is_published: false) pro ruční review
    const articleLen = translation.czechArticle.length
    const hasNoFullText = !fullText
    const isTooShort = articleLen < 500
    const isPublished = !(hasNoFullText && isTooShort)
    if (!isPublished) {
      console.warn(`[radar] quality gate: "${item.title.slice(0, 50)}" uloženo jako draft (no fullText, ${articleLen}z)`)
    }

    result.itemsAfterRelevanceCheck++

    const badge = ALLOWED_BADGES.has(translation.badge) ? translation.badge : 'news'

    // Hero image z Unsplash (best effort)
    const hero = await fetchHeroImage(translation.unsplashQuery, translation.czechTitle)

    // Unikátní slug
    const slug = await generateUniqueSlug(translation.czechTitle)

    // Upsert do radar_items (UNIQUE original_url)
    const { error: upsertErr } = await supabaseAdmin
      .from('radar_items')
      .upsert(
        {
          source: item.source,
          original_url: item.url,
          original_title: item.title,
          slug,
          czech_title: translation.czechTitle,
          czech_summary: translation.czechSummary,
          czech_article: translation.czechArticle,
          cz_context: translation.czContext,
          badge,
          country_code: translation.countryCode,
          meta_title: translation.metaTitle,
          meta_description: translation.metaDescription,
          image_url: hero?.url ?? null,
          image_alt: hero?.alt ?? null,
          image_attribution: hero?.attribution ?? null,
          image_source_url: hero?.sourceUrl ?? null,
          fingerprint: item.fingerprint,
          published_at: (item.pubDate ?? new Date()).toISOString(),
          is_published: isPublished,
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
