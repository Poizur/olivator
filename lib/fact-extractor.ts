// Claude-powered extraction of specific technical facts from raw product text.
// Runs once at import time; facts stored in products.extracted_facts JSONB.
// Used later by content-agent to guarantee specifics appear in AI rewrite.

import Anthropic from '@anthropic-ai/sdk'

// Haiku is 5x cheaper than Sonnet, plenty for structured extraction.
const MODEL = 'claude-haiku-4-5'

export type FactImportance = 'high' | 'medium' | 'low'
export type FactSource = 'scraped' | 'manual' | 'ai'

export interface ExtractedFact {
  key: string
  label: string
  value: string
  importance: FactImportance
  source: FactSource
}

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY missing')
  return new Anthropic({ apiKey: key })
}

const EXTRACTION_SYSTEM = `Jsi extrakční engine pro specifické technické detaily olivových olejů.
Z poskytnutého popisu produktu vrátíš pole objektů s extrahovanými fakty.

Co považuješ za FACTS (řaď do importance):

**HIGH** — unikátní technický detail, který odliší produkt:
- Teplota lisování ("do 40 °C", "nad 27 °C")
- Způsob sběru ("ruční", "mechanický", "brzká sklizeň", "early harvest")
- Čas od sklizně k lisování ("do 4 hodin", "24 hod")
- Přítomnost/absence přísad ("bez chemických přísad", "nefiltrovaný", "filtrovaný")
- Konkrétní odrůdy oliv ("Koroneiki", "Arbequina", "Lianolia", "Frantoio")
- Datum/rok sklizně pokud je uveden
- Specifický region/estate ("usedlost X", "farma Y")

**MEDIUM** — relevantní fakt (pokud není už v structured DB):
- Typ obalu (tmavé sklo, plech, PET)
- Způsob skladování doporučený výrobcem
- Rodinná firma (pouze pokud explicitně uvedeno)

**LOW** — skip, nestahuj do output:
- Marketingové fráze ("skvělý", "kvalitní", "nejlepší")
- Obecné charakteristiky ("středomořská chuť")
- Duplikát s structured daty (EAN, cena, volume — ty známe jinde)

Vrať POUZE JSON array, žádný jiný text:
[
  {"key": "processing_temp", "label": "Teplota lisování", "value": "do 40 °C", "importance": "high"},
  {"key": "harvest_method", "label": "Sběr", "value": "ruční", "importance": "high"},
  {"key": "additives", "label": "Přísady", "value": "bez chemických", "importance": "medium"}
]

Klíče (key) používej v snake_case z této palette:
- processing_temp, processing_method
- harvest_method, harvest_time, harvest_date
- additives, filtered
- olive_variety
- estate_name, family_farm
- storage_note

Hodnoty (value) piš v češtině, zachovej původní formulaci pokud je výstižná.
Labels v češtině pro uživatele.

Pokud v textu nenajdeš žádná HIGH nebo MEDIUM fakta, vrať: []`

export async function extractFactsFromText(
  rawText: string
): Promise<ExtractedFact[]> {
  if (!rawText || rawText.trim().length < 30) return []

  const client = getClient()

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Popis produktu:\n\n${rawText}\n\nVrať JSON array extrahovaných faktů.`,
        },
      ],
    })

    const text = res.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const cleaned = text
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const parsed = JSON.parse(cleaned) as Array<Omit<ExtractedFact, 'source'>>
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(f => f.key && f.label && f.value && f.importance)
      .map(f => ({
        ...f,
        source: 'scraped' as const,
      }))
  } catch (err) {
    console.warn('[fact-extractor] failed:', err instanceof Error ? err.message : err)
    return []
  }
}

/** Convert extracted facts → bullet list string for Claude rewrite prompt. */
export function factsToPromptContext(facts: ExtractedFact[]): string {
  if (facts.length === 0) return ''
  const high = facts.filter(f => f.importance === 'high')
  const medium = facts.filter(f => f.importance === 'medium')
  const lines: string[] = []

  if (high.length > 0) {
    lines.push('POVINNÁ FAKTA (MUSÍŠ zmínit v longDescription — každé z nich):')
    for (const f of high) {
      lines.push(`  • ${f.label}: ${f.value}`)
    }
  }
  if (medium.length > 0) {
    lines.push('')
    lines.push('Další relevantní fakta (zmíň pokud to do textu přirozeně sedí):')
    for (const f of medium) {
      lines.push(`  • ${f.label}: ${f.value}`)
    }
  }
  return lines.join('\n')
}
