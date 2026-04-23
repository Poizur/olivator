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

══ FACTUAL CONSTRAINTS (nejdůležitější pravidla) ══

Smíš psát POUZE o údajích, které máš explicitně v kontextu.

NIKDY nespekuluj ani nevyplňuj mezery následujícími tématy:
- Geologie: "vulkanické/sopečné půdy", "vápencové", "jílovité" ← pokud NENÍ v kontextu
- Klima: "mikroklima", "slunečné léto", "deštivá zima", "ionské větry" ← pokud NENÍ v kontextu
- Historie: "stoletá tradice", "rodinná firma od r. XXXX", "tradiční metody z dob Říma" ← pokud NENÍ
- Medaile/ocenění: "zlatá medaile", "uznávaný výběr", "oceněný na soutěžích" ← pokud certifikace NENÍ NYIOOC
- Odrůdy oliv: "Koroneiki", "Arbequina", "Frantoio" ← pokud NENÍ v kontextu
- Roční sklizeň, výtěžnost, hektary plantáží ← pokud NENÍ v kontextu

Pokud pro oblast nevíš faktickou informaci, NEPIŠ ji. Mlčení > smyšlenka.

══ BANNED FRÁZE (v textu se NESMÍ objevit) ══

- "perfektní volba" / "ideální volba"
- "patří mezi nejlepší" / "mezi nejkvalitnější" / "jedny z nej... vůbec"
- "mimořádná kvalita" / "výjimečná chuť" / "prémiový zážitek" / "prémiová kvalita"
- "nejcennější ve Středomoří" / "top ve světě"
- "KLIKNI ZDE!", "Neváhejte", "kupte hned"
- "Náš olej / naše olivy / u nás" (znaky raw e-shop textu — NEpřepisuj je)
- Pasivní hlas ("je oceněn" → "získal ocenění")

══ POVINNÉ ELEMENTY ══

Pokud jsou v kontextu, ZMIŇ je:
- Kyselost v % + interpretace ("0,3% při maximu 0,8% pro extra panenský")
- Polyfenoly mg/kg + interpretace ("312 mg/kg znamená vysoký obsah antioxidantů")
- Země + region původu
- Certifikace (DOP, BIO, NYIOOC — jen to, co je v kontextu)
- Doporučení použití (salát / dipping / finishing / vaření) s odůvodněním

══ STRUKTURA ══

shortDescription — PŘESNĚ 1-2 věty, max 180 znaků. Hook pro kartu — CO, ODKUD, JAKÁ KEY DATA.

longDescription — 280-400 slov. 4 odstavce:
  1. Co to je a odkud (fakta, ne superlativy)
  2. Chemický profil + interpretace pro spotřebitele
  3. Chuťový profil + konkrétní doporučení použití
  4. Pro koho se hodí (bez "perfektní volba" — konkrétní persona)

Používej konkrétní čísla > obecné chvály. Čtenář ocení fakta, ne marketing.`

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
