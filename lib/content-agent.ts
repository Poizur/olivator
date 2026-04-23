// Claude-backed Content Agent for product descriptions.
// Implements the system prompt from CLAUDE.md section 16 with stricter
// constraints + auto-retry when output is too short.

import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-20250514'
const MIN_LONG_WORDS = 250 // below this we auto-retry once with feedback

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
- Klima: "mikroklima", "slunečné léto", "deštivá zima", "ionské větry" ← pokud NENÍ
- Historie: "stoletá tradice", "rodinná firma od r. XXXX", "tradiční metody z dob Říma" ← NENÍ
- Medaile/ocenění: "zlatá medaile", "uznávaný výběr" ← pokud certifikace NENÍ NYIOOC
- Odrůdy oliv: "Koroneiki", "Arbequina", "Frantoio" ← pokud NENÍ v kontextu
- Roční sklizeň, výtěžnost, hektary plantáží ← pokud NENÍ v kontextu

Pokud pro oblast nevíš faktickou informaci, NEPIŠ ji. Mlčení > smyšlenka.

══ BANNED FRÁZE (v textu se NESMÍ objevit) ══

- "perfektní volba" / "ideální volba"
- "patří mezi nejlepší" / "mezi nejkvalitnější" / "jedny z nej… vůbec"
- "mimořádná kvalita" / "výjimečná chuť" / "prémiový zážitek"
- "nejcennější ve Středomoří" / "top ve světě"
- "KLIKNI ZDE!", "Neváhejte", "kupte hned"
- "Náš olej / naše olivy / u nás" (znaky raw e-shop textu)

══ DÉLKA — tvrdý požadavek ══

longDescription musí mít **minimálně 280 a ideálně 320–380 slov**.
Kratší texty jsou REJECTED a budou znovu generovány.

Pokud máš pocit, že dochází téma — vrať se k datům a rozveď je.
NEŠETŘI slovy. Čtenář chce detail, ne shrnutí.

══ ZDROJOVÝ POPIS (raw description) ══

Pokud ti dodám zdrojový popis z e-shopu nebo výrobce:
- Extrahuj z něj VŠECHNY specifické technické detaily a ZACHOVEJ je v textu:
  * Teploty zpracování ("lisováno do 40 °C", "za studena")
  * Způsob sběru (ruční, mechanický, brzká/pozdní sklizeň)
  * Časové údaje (kolik hodin od sklizně k lisování)
  * Přísady / jejich absence ("bez chemických přísad")
  * Konkrétní odrůdy oliv (pokud jsou uvedené)
  * Data sklizně
- Tato konkrétní fakta jsou to nejcennější co můžeš čtenáři dát
- NEOPISUJ ale ZACHYTI fakta — přepiš je v naší tónu
- Pokud mají tato data hodnotu pro spotřebitele, přidej kontext co to znamená

Čtenář ocení konkrétní technická fakta z reálné produkce více než obecné fráze.

══ STRUKTURA longDescription — 4 odstavce s počty slov ══

**1. odstavec (70–90 slov) — Co to je a odkud**
- Název, typ oleje, země + region
- Obal (tmavé sklo / plech), objem
- Jak byl zpracován (pokud víš: za studena, ruční sběr, datum sklizně)
- Neexistují-li tato data, rozveď co víš konkrétního — bez výmyslů

**2. odstavec (80–100 slov) — Chemie + co to znamená**
- Kyselost v % s kontextem: "EU norma pro extra panenský je max 0,8%"
- Polyfenoly mg/kg s kontextem: "EU health claim pro antioxidanty vyžaduje min 250 mg/kg"
- Pokud některý údaj chybí, přeskoč ho (nevymýšlej si)
- Vysvětli, co čísla znamenají pro chuť a zdravotní benefit

**3. odstavec (90–110 slov) — Chuť a použití**
- Jaké chuťové vlastnosti očekávat (jemný/intenzivní, pálivý/sladký)
- Konkrétní příklady použití: který typ salátu, jaké jídlo polévat, co se nehodí
- Proč právě tenhle — vazba na data ("díky nízké pálivosti se hodí na jemné ryby")
- 3-5 konkrétních pokrmů/aplikací

**4. odstavec (60–80 slov) — Pro koho se hodí**
- Konkrétní persona (NE "pro milovníky kvality" — moc obecné)
- Např: "pro toho, kdo vaří středomořskou kuchyni denně a hledá spolehlivý olej na dresinky"
- Jemný hint na cenu/hodnotu (pokud je to smysluplné)

Celkem: 300–380 slov. Kontroluj si počet před odesláním.

══ shortDescription ══

PŘESNĚ 1-2 věty, 100–180 znaků. Hook pro kartu.
Musí obsahovat: země/region + jedno klíčové data (kyselost nebo certifikace).`

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
  factsPromptContext?: string | null // pre-formatted text from factsToPromptContext()
}

export interface ContentOutput {
  shortDescription: string
  longDescription: string
}

function buildUserPrompt(p: ContentInput, retryFeedback?: string): string {
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
    lines.push(`Zdrojový popis z retailera (použij jen jako inspiraci, nepřepisuj doslova):`)
    lines.push(p.rawDescription)
  }
  if (p.factsPromptContext) {
    lines.push('')
    lines.push(p.factsPromptContext)
  }
  lines.push('')
  if (retryFeedback) {
    lines.push('══ FEEDBACK NA PŘEDCHOZÍ POKUS ══')
    lines.push(retryFeedback)
    lines.push('')
  }
  lines.push('Odpověz JEN jako validní JSON:')
  lines.push('{ "shortDescription": "...", "longDescription": "..." }')
  lines.push('Žádný další text před ani po JSONu. Dodrž délky (long 300-380 slov).')
  return lines.join('\n')
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

async function callClaude(
  client: Anthropic,
  input: ContentInput,
  retryFeedback?: string
): Promise<ContentOutput> {
  // Retry wrapper for 529 Overloaded (per CLAUDE.md BUG-017)
  const retries = [5000, 15000, 30000, 60000]
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= retries.length; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(input, retryFeedback) }],
      })
      const text = res.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')
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
      const isOverloaded =
        err instanceof Anthropic.APIError && (err.status === 529 || err.status === 503)
      if (!isOverloaded || attempt >= retries.length) break
      await new Promise(r => setTimeout(r, retries[attempt]))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Claude API failed')
}

export async function generateProductDescriptions(
  input: ContentInput
): Promise<ContentOutput> {
  const client = getClient()

  // First attempt
  let result = await callClaude(client, input)
  let wordCount = countWords(result.longDescription)

  // Auto-retry ONCE if too short — Claude consistently underdelivers
  if (wordCount < MIN_LONG_WORDS) {
    const feedback = `Tvůj předchozí pokus měl pouze ${wordCount} slov v longDescription, ale minimum je ${MIN_LONG_WORDS} (ideál 300-380). Napiš znovu DELŠÍ verzi. Rozveď:
- 1. odstavec: přidej detail o obalu, zpracování, sklizni
- 2. odstavec: vysvětli co kyselost a polyfenoly znamenají pro spotřebitele
- 3. odstavec: přidej 3-5 konkrétních pokrmů s tímto olejem
- 4. odstavec: popiš specifickou personu kdo ocení právě tento olej
Nerozvolňuj floskulemi — přidej konkrétní informace.`
    result = await callClaude(client, input, feedback)
    wordCount = countWords(result.longDescription)
  }

  return result
}
