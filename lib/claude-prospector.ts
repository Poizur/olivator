// Claude Prospector — používá Claude k návrhu nových českých e-shopů
// specializovaných na olivový olej a středomořské produkty.
//
// Strategie: Claude má aktuálnější přehled trhu než hardcoded curated list.
// Vrátí JSON pole kandidátů; každý kandidát se pak otestuje crawler testem.
// Hallucinace doménů jsou OK — neexistující domény spadnou v testu na 'rejected'.

import { callClaude, extractText } from './anthropic'

export interface ClaudeCandidate {
  domain: string
  name: string
  reasoning: string
}

const SYSTEM_PROMPT = `Jsi prospector pro Olivator.cz — největší srovnávač olivových olejů v ČR.

ÚKOL: Vrať seznam českých e-shopů (.cz domén) které prodávají olivový olej.

PRIORITA:
1. Specializované e-shopy na olivový olej, řecké/italské/španělské speciality
2. Bio/zdravá výživa shopy s olivovými oleji
3. Gourmet / delikatesy

VYHNI SE:
- Mainstream grocery (rohlik.cz, kosik.cz, tesco.cz, albert.cz) — máme je separátně
- Marketplaces (heureka, zboží, alza, mall) — agregátory, ne přímí prodejci
- Velké hypermarkety
- Pochybné domény bez ověřitelné existence

OUTPUT FORMAT — pouze validní JSON, žádný markdown ani text okolo:
{"candidates": [
  {"domain": "example.cz", "name": "Example Shop", "reasoning": "Specialty řecký olivový olej"}
]}

Pravidla:
- Pouze .cz nebo .sk domény
- "domain" = pouze hostname bez https:// a bez koncového /
- "name" = max 30 znaků, lidsky čitelný
- "reasoning" = max 60 znaků, proč doporučuješ
- Min 15, max 30 kandidátů
- Žádné duplicity`

/**
 * Zeptá se Claude na seznam kandidátních e-shopů.
 * Vrací prázdné pole při jakékoliv chybě (graceful degradation).
 */
export async function discoverCandidatesViaClaude(
  excludeDomains: string[] = []
): Promise<ClaudeCandidate[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[claude-prospector] ANTHROPIC_API_KEY missing, returning empty list')
    return []
  }

  const exclusionHint = excludeDomains.length > 0
    ? `\n\nUŽ ZNÁME (nezahrnuj):\n${excludeDomains.slice(0, 100).join(', ')}`
    : ''

  try {
    const response = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Najdi mi 20-30 českých e-shopů kde se dá koupit olivový olej.${exclusionHint}`,
        },
      ],
    })

    const text = extractText(response).trim()
    // Strip případný markdown wrapping (pro jistotu)
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const parsed = JSON.parse(json) as { candidates?: ClaudeCandidate[] }
    const list = Array.isArray(parsed?.candidates) ? parsed.candidates : []

    // Sanitize každý záznam
    return list
      .map((c) => ({
        domain: String(c.domain ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').trim(),
        name: String(c.name ?? '').slice(0, 50).trim(),
        reasoning: String(c.reasoning ?? '').slice(0, 120).trim(),
      }))
      .filter((c) => c.domain && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(c.domain))
  } catch (err) {
    console.error('[claude-prospector] failed:', err instanceof Error ? err.message : err)
    return []
  }
}
