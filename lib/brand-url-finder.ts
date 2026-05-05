// Brand URL finder — najde oficiální web výrobce olivového oleje pro značku.
//
// Strategie:
//   1. Claude Haiku + web_search server tool — vyhledá web a ohodnotí
//      kandidáty. Typicky najde výsledek na 1. pokus za ~10s, ~$0,02.
//   2. Heuristický fallback — pokud web search nic nenašel, zkus
//      <slug>.it / .gr / .com a ověř že stránka mluví o olivovém oleji.
//
// Vrací top kandidáta s confidence score. Admin/orchestrátor rozhodne
// zda je dost dobrý (typicky ≥ 70).

import { callClaude, extractText } from './anthropic'

export interface ProducerUrlCandidate {
  url: string
  confidence: number
  reasoning: string
  source: 'web_search' | 'heuristic'
}

interface FinderInput {
  brandName: string
  countryCode: string | null
  /** Region produktů z naší DB (např. "Apulia"). Pomáhá zúžit hledání. */
  regionHint: string | null
  /** Názvy produktů této značky — pomocné pro keyword cross-check. */
  productNames: string[]
}

const SYSTEM_PROMPT = `Jsi research asistent pro Olivator.cz.

ÚLOHA: Najdi OFICIÁLNÍ web výrobce/lisovny olivového oleje. NE retailera, NE
katalogovou stránku, NE blog.

POSTUP:
1. Spusť web_search s dotazem: '"<jméno značky>" olive oil producer <region>'.
2. Pokud výsledky neukazují výrobce, zkus '"<jméno značky>" olio extra vergine'
   nebo '"<jméno značky>" elaiolado' (pro řecké).
3. Ignoruj výsledky z amazon.*, ebay.*, eshopů, blogů, recenzních stránek,
   wikipedie. Zaměř se na vlastní doménu výrobce.
4. Cross-check: doména obvykle obsahuje jméno značky (oliointini.it, gaea.gr).
   Web musí mluvit o olivovém oleji, ideálně zmiňovat regiony/produkty
   které máš v zadání.

KRITÉRIA CONFIDENCE:
- 90+: doména obsahuje brand name + web zmiňuje konkrétní produkt z naší DB
- 75-89: doména je výrobce, region/země sedí, ale produkty neověřeny
- 60-74: web vypadá jako výrobce ale chybí silné indicie
- pod 60: nejistý kandidát, raději nevracet

VÝSTUP — POUZE validní JSON, žádné komentáře, žádný text okolo:
{
  "url": "https://oliointini.it",
  "confidence": 88,
  "reasoning": "Krátká věta proč."
}

Pokud nic nenajdeš:
{ "url": null, "confidence": 0, "reasoning": "Důvod proč nic." }`

function buildUserMessage(input: FinderInput): string {
  const parts: string[] = [
    `Značka: ${input.brandName}`,
    `Země: ${countryName(input.countryCode)}`,
  ]
  if (input.regionHint) parts.push(`Region produktů: ${input.regionHint}`)
  if (input.productNames.length > 0) {
    parts.push(`Naše produkty této značky: ${input.productNames.slice(0, 5).join(', ')}`)
  }
  parts.push('', 'Najdi oficiální web výrobce a vrať JSON dle schématu výše.')
  return parts.join('\n')
}

function countryName(code: string | null): string {
  if (!code) return '(neznámá)'
  const map: Record<string, string> = {
    IT: 'Itálie',
    GR: 'Řecko',
    ES: 'Španělsko',
    HR: 'Chorvatsko',
    PT: 'Portugalsko',
    TR: 'Turecko',
    MA: 'Maroko',
    TN: 'Tunisko',
    IL: 'Izrael',
  }
  return map[code] ?? code
}

function parseUrlResponse(raw: string): { url: string | null; confidence: number; reasoning: string } {
  // Claude občas zabalí do ```json ... ```
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  // Nebo vyplivne text + JSON na konci — vytáhni první { ... } block
  const match = cleaned.match(/\{[\s\S]*\}/)
  const jsonStr = match ? match[0] : cleaned
  try {
    const parsed = JSON.parse(jsonStr) as { url?: unknown; confidence?: unknown; reasoning?: unknown }
    return {
      url: typeof parsed.url === 'string' && parsed.url.startsWith('http') ? parsed.url : null,
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, parsed.confidence)) : 0,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 500) : '',
    }
  } catch {
    return { url: null, confidence: 0, reasoning: 'Parser failed: ' + raw.slice(0, 200) }
  }
}

const RETAILER_BLOCKLIST = new Set([
  'amazon.com',
  'amazon.it',
  'amazon.de',
  'ebay.com',
  'ebay.it',
  'wikipedia.org',
  'rohlik.cz',
  'kosik.cz',
  'olivio.cz',
  'gaea.cz',
  'mall.cz',
  'iherb.com',
  'tripadvisor.com',
  'yelp.com',
])

function isBlocked(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return RETAILER_BLOCKLIST.has(host)
  } catch {
    return true
  }
}

export async function findProducerUrl(input: FinderInput): Promise<ProducerUrlCandidate | null> {
  // Stage 1: Claude + web_search
  try {
    const response = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 4,
        },
      ],
      messages: [{ role: 'user', content: buildUserMessage(input) }],
    })

    const text = extractText(response)
    if (text) {
      const parsed = parseUrlResponse(text)
      if (parsed.url && parsed.confidence >= 50 && !isBlocked(parsed.url)) {
        return {
          url: parsed.url,
          confidence: parsed.confidence,
          reasoning: parsed.reasoning,
          source: 'web_search',
        }
      }
    }
  } catch (err) {
    console.error('[brand-url-finder] web_search failed:', err)
  }

  // Stage 2: Heuristický fallback — zkus typické TLD
  const heuristic = await heuristicGuess(input)
  if (heuristic) return heuristic

  return null
}

async function heuristicGuess(input: FinderInput): Promise<ProducerUrlCandidate | null> {
  const slug = input.brandName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
  if (!slug || slug.length < 3) return null

  const tldsByCountry: Record<string, string[]> = {
    IT: ['.it', '.com'],
    GR: ['.gr', '.com'],
    ES: ['.es', '.com'],
    HR: ['.hr', '.com'],
    PT: ['.pt', '.com'],
  }
  const tlds = (input.countryCode && tldsByCountry[input.countryCode]) ?? ['.com', '.it', '.gr']

  const variants = [`olio${slug}`, `oleo${slug}`, slug, `${slug}olive`]
  const candidates: string[] = []
  for (const v of variants) {
    for (const tld of tlds) {
      candidates.push(`https://${v}${tld}`)
    }
  }

  for (const url of candidates) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'OlivatorBot/1.0', Accept: 'text/html' },
        signal: controller.signal,
        redirect: 'follow',
      })
      clearTimeout(timer)
      if (!res.ok) continue
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('text/html')) continue
      const html = (await res.text()).toLowerCase()
      // Musí zmínit olivový olej v jakémkoli jazyce
      if (
        /olive oil|olivový olej|olio extra ?vergine|aceite de oliva|elaiolado|huile d'olive|maslinovo ulje/.test(
          html
        )
      ) {
        return {
          url,
          confidence: 65,
          reasoning: `Heuristický odhad — doména existuje a stránka zmiňuje olivový olej. Ověř manuálně.`,
          source: 'heuristic',
        }
      }
    } catch {
      // ignore — not a real domain or timeout
    }
  }
  return null
}
