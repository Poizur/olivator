// Claude-backed Content Agent for product descriptions.
// Implements the system prompt from CLAUDE.md section 16.

import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-20250514'

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY missing')
  return new Anthropic({ apiKey: key })
}

const SYSTEM_PROMPT = `Jsi hlavní editor Olivator.cz — největšího srovnávače olivových olejů v ČR.
Piš přirozenou češtinou, aktivním hlasem, přítomným časem.
Tón: chytrý kamarád sommelier (Wirecutter + Wine Folly styl).

POVINNÉ v každém produktovém popisu:
- Název produktu a značky
- Kyselost v % (pokud je k dispozici)
- Polyfenoly mg/kg (pokud jsou k dispozici)
- Původ (země a region)
- Pro jaké použití se hodí (salát, dipping, vaření...)

ZAKÁZÁNO:
- Vymýšlet data která nejsou v kontextu
- "prémiový zážitek", "výjimečná chuť", "perfektní kvalita" (prázdné marketingové fráze)
- "KLIKNI ZDE!", "Neváhejte", agresivní CTA
- Placeholder text [DOPLNIT] nebo TODO
- Pasivní hlas ("je oceněn", "byl lisován" → "získal ocenění", "lisuje se")

Stručný popis (shortDescription) — PŘESNĚ 1-2 věty, max 180 znaků, český pohled. Hook pro kartu.
Dlouhý popis (longDescription) — 250-350 slov. Strukturován:
  1. Úvodní odstavec: co to je, odkud, co dělá oleje ze stejného regionu výjimečnými
  2. Chemický profil: kyselost, polyfenoly, co to znamená pro spotřebitele
  3. Chuťový profil a použití: na co se hodí, na co ne
  4. Shrnutí pro koho je`

export interface ContentInput {
  name: string
  brand?: string | null
  origin?: string | null
  region?: string | null
  type?: string | null
  volumeMl?: number | null
  acidity?: number | null
  polyphenols?: number | null
  certifications?: string[]
  rawDescription?: string | null
  olivatorScore?: number | null
}

export interface ContentOutput {
  shortDescription: string
  longDescription: string
}

function buildUserPrompt(p: ContentInput): string {
  const lines: string[] = []
  lines.push(`Napiš krátký a dlouhý popis pro produkt:`)
  lines.push('')
  lines.push(`Název: ${p.name}`)
  if (p.brand) lines.push(`Značka: ${p.brand}`)
  if (p.type) lines.push(`Typ: ${p.type}`)
  if (p.origin) lines.push(`Země původu: ${p.origin}`)
  if (p.region) lines.push(`Region: ${p.region}`)
  if (p.volumeMl) lines.push(`Objem: ${p.volumeMl} ml`)
  if (p.acidity != null) lines.push(`Kyselost: ${p.acidity} %`)
  if (p.polyphenols != null) lines.push(`Polyfenoly: ${p.polyphenols} mg/kg`)
  if (p.certifications && p.certifications.length > 0) {
    lines.push(`Certifikace: ${p.certifications.join(', ')}`)
  }
  if (p.olivatorScore != null) lines.push(`Olivator Score: ${p.olivatorScore}/100`)
  if (p.rawDescription) {
    lines.push('')
    lines.push(`Zdrojový popis z retailera (použij jen jako inspiraci, nepřepisuj doslova — ať je to unikátní pro SEO):`)
    lines.push(p.rawDescription)
  }
  lines.push('')
  lines.push('Odpověz JEN jako validní JSON:')
  lines.push('{ "shortDescription": "...", "longDescription": "..." }')
  lines.push('Žádný další text před ani po JSONu.')
  return lines.join('\n')
}

export async function generateProductDescriptions(
  input: ContentInput
): Promise<ContentOutput> {
  const client = getClient()

  // Retry wrapper for 529 Overloaded (per CLAUDE.md BUG-017)
  const retries = [5000, 15000, 30000, 60000]
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= retries.length; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(input) }],
      })
      // Extract text
      const text = res.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')
      // Parse JSON — Claude sometimes wraps in ```json``` fences
      const cleaned = text
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```\s*$/, '')
        .trim()
      const parsed = JSON.parse(cleaned) as ContentOutput
      if (!parsed.shortDescription || !parsed.longDescription) {
        throw new Error('Claude vrátil neúplný JSON')
      }
      return parsed
    } catch (err) {
      lastErr = err
      // Only retry on 529 Overloaded
      const isOverloaded =
        err instanceof Anthropic.APIError && (err.status === 529 || err.status === 503)
      if (!isOverloaded || attempt >= retries.length) break
      await new Promise(r => setTimeout(r, retries[attempt]))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Claude API failed')
}
