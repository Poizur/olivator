// Claude-powered flavor profile estimator.
// Reads raw_description + name + structured facts, outputs 7 axes on 0-100 scale.
// Uses Haiku (cheap, fast). Deterministic low-temperature output.

import { callClaude, extractText } from './anthropic'

const MODEL = 'claude-haiku-4-5'

export interface FlavorInput {
  name: string
  rawDescription: string | null
  shortDescription?: string | null
  acidity?: number | null
  polyphenols?: number | null
  originCountry?: string | null
  originRegion?: string | null
  type?: string | null
}

export interface FlavorProfile {
  fruity: number
  herbal: number
  bitter: number
  spicy: number
  mild: number
  nutty: number
  buttery: number
}

export interface FlavorProfileWithReasoning extends FlavorProfile {
  reasoning: string // 1-2 sentences explaining the call
}

const SYSTEM_PROMPT = `Jsi senzorický analytik olivových olejů. Z popisu produktu odhadneš 7 chuťových os na stupnici 0-100.

══ OSY ══

- **fruity (ovocnost)** — 0-100 — intenzita ovocných tónů (jablko, banán, zelené ovoce, tropické)
- **herbal (byliny)** — 0-100 — tráva, listové zelené bylinky, artyčok, rajčatová nať
- **bitter (hořkost)** — 0-100 — hořkost typická pro polyfenoly (early harvest olej)
- **spicy (pálivost)** — 0-100 — pálivost/štiplavost v hrdle (oleocanthal polyfenol)
- **mild (jemnost)** — 0-100 — opak intenzity; jemný olej má mild HIGH
- **nutty (oříšky)** — 0-100 — mandle, lísková oříška, vlašák (typické pro zralejší olivy)
- **buttery (máslový)** — 0-100 — krémová, sametová, máslová textura v ústech

══ HEURISTIKY ══

**Z popisu hledej klíčová slova:**
- "jemný", "mild", "hladký", "bez pálivosti" → mild HIGH (70-90), bitter LOW (0-25), spicy LOW (0-25)
- "pálivý", "pikantní", "štiplavý", "peprný" → spicy HIGH (60-90)
- "hořký", "travnatý", "zelený", "early harvest", "brzká sklizeň" → bitter HIGH (60-90), herbal HIGH (60-85)
- "ovocný", "fruity" → fruity HIGH (60-90)
- "oříšky", "mandle", "zralé" → nutty HIGH (60-90)
- "máslový", "krémový", "hladký", "smooth" → buttery HIGH (60-80)
- "bez pikantního závěru" → spicy VERY LOW (5-20), bitter LOW (10-30), mild HIGH (70-90)

**Z původu:**
- Kréta, Peloponés, Messénie, jižní Řecko → typicky herbal + bitter HIGH (Koroneiki odrůda)
- Korfu, Lefkada, Zakynthos → typicky mild HIGH, buttery MEDIUM (Lianolia odrůda)
- Toskánsko, Umbrie → bitter + spicy HIGH (Frantoio, Leccino)
- Apulie, Sicílie → fruity + buttery MEDIUM-HIGH
- Andalusie (Picual) → bitter + spicy HIGH, fruity HIGH
- Arbequina (Katalánsko) → mild + buttery + fruity HIGH, bitter/spicy LOW

**Z chemie:**
- polyphenols > 400 mg/kg → bitter + spicy HIGH (polyfenoly = hořkost + pálivost)
- polyphenols < 200 mg/kg → mild + buttery HIGH, bitter + spicy LOW
- polyphenols neznámé + jemný popis → mild HIGH
- acidity < 0.3 → jemný, mild tendency

**Pravidlo součtu:** NE, nemusí to dávat 100. Každá osa je nezávislá.

**Default pro EVOO bez informací:** všechny osy okolo 40-55 (neutrální střed).

══ OUTPUT ══

Vrať POUZE JSON (žádný markdown, žádný text okolo):
{
  "fruity": 45,
  "herbal": 30,
  "bitter": 20,
  "spicy": 15,
  "mild": 75,
  "nutty": 40,
  "buttery": 55,
  "reasoning": "Jemný Korfu olej (Lianolia odrůda), popis zmiňuje 'bez pikantního závěru' a 'velice jemný' → vysoký mild, nízký spicy/bitter. Buttery tendence typická pro severní Řecko."
}

Hodnoty JSOU čísla 0-100 (ne desetinná). Reasoning: 1-2 věty česky.`

export async function estimateFlavorProfile(input: FlavorInput): Promise<FlavorProfileWithReasoning> {
  const lines: string[] = []
  lines.push(`Název: ${input.name}`)
  if (input.type) lines.push(`Typ: ${input.type}`)
  if (input.originCountry) lines.push(`Země: ${input.originCountry}`)
  if (input.originRegion) lines.push(`Region: ${input.originRegion}`)
  if (input.acidity != null) lines.push(`Kyselost: ${input.acidity}%`)
  if (input.polyphenols != null) lines.push(`Polyfenoly: ${input.polyphenols} mg/kg`)
  if (input.shortDescription) {
    lines.push('')
    lines.push('Krátký popis:')
    lines.push(input.shortDescription)
  }
  if (input.rawDescription) {
    lines.push('')
    lines.push('Popis z e-shopu (původní surový text):')
    lines.push(input.rawDescription.slice(0, 3000)) // truncate to keep Haiku fast
  }
  lines.push('')
  lines.push('Odhadni 7 chuťových os a vrať JSON.')

  const userContent = lines.join('\n')

  // Retry pro 529 Overloaded je v callClaude wrapperu (lib/anthropic.ts).
  const res = await callClaude({
    model: MODEL,
    max_tokens: 512,
    temperature: 0.2, // lower temp = more consistent estimates
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })
  const text = extractText(res)
  const cleaned = text
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  const parsed = JSON.parse(cleaned) as FlavorProfileWithReasoning

  // Validate: all 7 axes present as numbers 0-100
  const axes = ['fruity', 'herbal', 'bitter', 'spicy', 'mild', 'nutty', 'buttery'] as const
  for (const axis of axes) {
    const v = parsed[axis]
    if (typeof v !== 'number' || v < 0 || v > 100) {
      throw new Error(`Invalid ${axis}: ${v}`)
    }
    // Clamp to integer in case Haiku returned decimals
    parsed[axis] = Math.round(v)
  }
  if (typeof parsed.reasoning !== 'string') parsed.reasoning = ''

  return parsed
}
