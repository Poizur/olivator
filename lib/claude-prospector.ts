// Claude Prospector — používá Claude S WEB SEARCH nástrojem k objevení
// reálných českých e-shopů s olivovým olejem.
//
// Strategie: Claude má přístup k web search (Anthropic native tool),
// takže nehalucinuje z paměti — reálně vyhledává aktuální shopy na internetu.
// Vrátí JSON pole kandidátů; každý se pak otestuje crawler testem.
//
// Cena: ~$10 / 1000 web searches. Jedno spuštění prospectora ≈ 5-8 search calls
// + Sonnet tokens ≈ $0.10-0.20. Zato kvalita >> hardcoded curated list.

import { callClaude, extractText } from './anthropic'

export interface ClaudeCandidate {
  domain: string
  name: string
  reasoning: string
}

const SYSTEM_PROMPT = `Jsi prospector pro Olivator.cz — největší srovnávač olivových olejů v ČR.

ÚKOL: Najdi reálné české (.cz) e-shopy které prodávají olivový olej.

POUŽIJ WEB SEARCH — vyhledávej na webu, NEHALUCINUJ z paměti.
Zkus dotazy jako:
- "olivový olej eshop"
- "specializované e-shopy olivový olej Česko"
- "extra panenský olivový olej kde koupit"
- "řecký olivový olej eshop CZ"
- "italský olivový olej dovoz CZ"

PRIORITA (highest first):
1. Specializované e-shopy POUZE na olivový olej / středomořské speciality
2. Bio/zdravá výživa shopy s širším sortimentem olejů
3. Gourmet / delikatesy s olivovými oleji

VYHNI SE:
- Mainstream grocery (rohlik.cz, kosik.cz, tesco.cz, albert.cz, lidl.cz, billa.cz)
- Marketplaces (heureka.cz, zbozi.cz, alza.cz, mall.cz, allegro.cz)
- Velké kosmetické shopy
- Domény co nemůžeš ověřit ze search výsledků

OVĚŘUJ:
- Doména MUSÍ vyjít z reálných search výsledků (ne tvoje paměť)
- Shop MUSÍ aktuálně existovat a fungovat
- Shop MUSÍ mít olivový olej v sortimentu (ideálně viditelná kategorie nebo produkt)

OUTPUT FORMAT — pouze validní JSON, žádný markdown ani text okolo:
{"candidates": [
  {"domain": "example.cz", "name": "Example Shop", "reasoning": "Specialty řecký shop, viděno v search"}
]}

Pravidla:
- Pouze .cz domény (případně .sk)
- "domain" = pouze hostname bez https:// a bez koncového /
- "name" = max 30 znaků
- "reasoning" = max 80 znaků, krátce odkud víš
- Min 10, max 25 kandidátů (kvalita > kvantita)
- Žádné duplicity
- Pokud nenajdeš nic spolehlivého, vrať méně — radši 5 kvalitních než 25 vymyšlených`

/**
 * Zeptá se Claude na seznam kandidátních e-shopů.
 * Claude má web_search nástroj, takže reálně vyhledává.
 * Vrací prázdné pole při jakékoliv chybě.
 */
export async function discoverCandidatesViaClaude(
  excludeDomains: string[] = []
): Promise<ClaudeCandidate[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[claude-prospector] ANTHROPIC_API_KEY missing, returning empty list')
    return []
  }

  const exclusionHint =
    excludeDomains.length > 0
      ? `\n\nUŽ ZNÁME (do seznamu nepřidávej):\n${excludeDomains.slice(0, 80).join(', ')}`
      : ''

  try {
    // Sonnet 4 + web_search. Haiku web search nepodporuje.
    const response = await callClaude({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 8,
          // Block marketplaces — chceme přímé prodejce, ne agregátory
          blocked_domains: [
            'heureka.cz',
            'zbozi.cz',
            'alza.cz',
            'mall.cz',
            'allegro.cz',
            'rohlik.cz',
            'kosik.cz',
            'tesco.cz',
            'albert.cz',
            'lidl.cz',
            'billa.cz',
          ],
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Najdi mi 10-25 reálných českých e-shopů s olivovým olejem. Použij web search!${exclusionHint}`,
        },
      ],
    })

    const text = extractText(response).trim()
    if (!text) {
      console.warn('[claude-prospector] empty response from Claude')
      return []
    }

    // Strip případný markdown wrapping a vyextrahuj JSON object
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    const json = firstBrace >= 0 && lastBrace > firstBrace
      ? text.slice(firstBrace, lastBrace + 1)
      : text

    const parsed = JSON.parse(json) as { candidates?: ClaudeCandidate[] }
    const list = Array.isArray(parsed?.candidates) ? parsed.candidates : []

    // Sanitize každý záznam
    return list
      .map((c) => ({
        domain: String(c.domain ?? '')
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '')
          .trim(),
        name: String(c.name ?? '').slice(0, 50).trim(),
        reasoning: String(c.reasoning ?? '').slice(0, 120).trim(),
      }))
      .filter((c) => c.domain && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(c.domain))
  } catch (err) {
    console.error('[claude-prospector] failed:', err instanceof Error ? err.message : err)
    return []
  }
}
