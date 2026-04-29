// AI generátor "doplňkového" obsahu pro entity stránky.
// Vrací strukturovaný JSON: TL;DR + (terroir | timeline | pairing) + FAQ.
// Admin vidí návrh v modalu, schvaluje per item.
//
// Liší se od entity-content-generator (ten generuje dlouhý markdown popis).
// Tady generujeme krátké strukturované kusy pro 8-blokovou kostru.

import { callClaude as callClaudeShared, extractText } from './anthropic'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2000

const SYSTEM_PROMPT = `Jsi editor Olivator.cz. Generuješ STRUKTUROVANÝ JSON pro doplňky entity stránek.

PRAVIDLA:
- POUZE co můžeš odvodit ze zadaného kontextu (popis, produkty, region/země).
- Nefabrikuj historická data, čísla, certifikace, ocenění.
- Český jazyk, přirozený tón "chytrý kamarád sommelier".
- Žádné fráze "prémiový", "výjimečný", "ideální volba", "patří mezi nejlepší".
- Konkrétně > obecně. Žádné prázdné chvalozpěvy.

VÝSTUP:
- VŽDY validní JSON podle schématu uvedeného v prompt.
- Žádný markdown, žádný úvodní text, jen surový JSON.
- Pokud nějaké pole nelze rozumně odvodit, vrať prázdný string nebo prázdné pole.`

interface BaseInput {
  name: string
  descriptionLong?: string | null
  productCount: number
  /** Příklady produktů pro kontext — max 5. */
  topProducts: Array<{
    name: string
    olivatorScore: number | null
    acidity: number | null
    polyphenols: number | null
    cultivars?: string[]
  }>
}

export interface RegionExtrasInput extends BaseInput {
  type: 'region'
  countryName: string
}

export interface BrandExtrasInput extends BaseInput {
  type: 'brand'
  countryName: string
  story?: string | null
  philosophy?: string | null
  foundedYear?: number | null
}

export interface CultivarExtrasInput extends BaseInput {
  type: 'cultivar'
  countriesGrown: string[]
  avgPolyphenols: number | null
}

export type ExtrasInput = RegionExtrasInput | BrandExtrasInput | CultivarExtrasInput

export interface RegionExtrasOutput {
  tldr: string
  terroir: { climate: string; soil: string; tradition: string }
  faqs: Array<{ question: string; answer: string }>
}

export interface BrandExtrasOutput {
  tldr: string
  timeline: Array<{ year: number; label: string; description?: string }>
  faqs: Array<{ question: string; answer: string }>
}

export interface CultivarExtrasOutput {
  tldr: string
  nickname: string
  primary_use: 'cooking' | 'finishing' | 'dipping' | 'frying' | 'universal' | ''
  pairing_pros: string[]
  pairing_cons: string[]
  faqs: Array<{ question: string; answer: string }>
}

export type ExtrasOutput = RegionExtrasOutput | BrandExtrasOutput | CultivarExtrasOutput

async function callClaude(userPrompt: string): Promise<string> {
  const res = await callClaudeShared({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })
  return extractText(res).trim()
}

function parseJson<T>(raw: string): T {
  // Strip code fences pokud Claude vrátí ```json ... ```
  const cleaned = raw
    .replace(/^```(?:json)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    throw new Error(
      `Claude vrátil nevalidní JSON: ${err instanceof Error ? err.message : 'unknown'}\n\nRaw: ${raw.slice(0, 500)}`
    )
  }
}

/**
 * Defenzivní normalizace AI výstupu — i když Claude vynechá pole,
 * vrátíme bezpečné defaulty aby UI nepadalo na .length undefined.
 */
function normalizeRegion(raw: Partial<RegionExtrasOutput>): RegionExtrasOutput {
  return {
    tldr: typeof raw.tldr === 'string' ? raw.tldr : '',
    terroir: {
      climate: raw.terroir?.climate ?? '',
      soil: raw.terroir?.soil ?? '',
      tradition: raw.terroir?.tradition ?? '',
    },
    faqs: Array.isArray(raw.faqs)
      ? raw.faqs.filter(
          (f): f is { question: string; answer: string } =>
            typeof f?.question === 'string' && typeof f?.answer === 'string'
        )
      : [],
  }
}

function normalizeBrand(raw: Partial<BrandExtrasOutput>): BrandExtrasOutput {
  return {
    tldr: typeof raw.tldr === 'string' ? raw.tldr : '',
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.filter(
          (m): m is { year: number; label: string; description?: string } =>
            typeof m?.year === 'number' && typeof m?.label === 'string'
        )
      : [],
    faqs: Array.isArray(raw.faqs)
      ? raw.faqs.filter(
          (f): f is { question: string; answer: string } =>
            typeof f?.question === 'string' && typeof f?.answer === 'string'
        )
      : [],
  }
}

function normalizeCultivar(raw: Partial<CultivarExtrasOutput>): CultivarExtrasOutput {
  const validUses = ['cooking', 'finishing', 'dipping', 'frying', 'universal']
  const primary_use = validUses.includes(raw.primary_use as string)
    ? (raw.primary_use as CultivarExtrasOutput['primary_use'])
    : ''
  return {
    tldr: typeof raw.tldr === 'string' ? raw.tldr : '',
    nickname: typeof raw.nickname === 'string' ? raw.nickname : '',
    primary_use,
    pairing_pros: Array.isArray(raw.pairing_pros)
      ? raw.pairing_pros.filter((s): s is string => typeof s === 'string')
      : [],
    pairing_cons: Array.isArray(raw.pairing_cons)
      ? raw.pairing_cons.filter((s): s is string => typeof s === 'string')
      : [],
    faqs: Array.isArray(raw.faqs)
      ? raw.faqs.filter(
          (f): f is { question: string; answer: string } =>
            typeof f?.question === 'string' && typeof f?.answer === 'string'
        )
      : [],
  }
}

function formatProducts(products: BaseInput['topProducts']): string {
  return products
    .slice(0, 5)
    .map((p, i) => {
      const meta = [
        p.olivatorScore != null ? `score ${p.olivatorScore}` : null,
        p.acidity != null ? `kyselost ${p.acidity}%` : null,
        p.polyphenols != null ? `polyfenoly ${p.polyphenols} mg/kg` : null,
        p.cultivars && p.cultivars.length > 0 ? `odrůda ${p.cultivars.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      return `${i + 1}. ${p.name} (${meta})`
    })
    .join('\n')
}

export async function generateRegionExtras(input: RegionExtrasInput): Promise<RegionExtrasOutput> {
  const prompt = `Region: ${input.name} (${input.countryName})
Počet olejů: ${input.productCount}
Top produkty:
${formatProducts(input.topProducts)}

${input.descriptionLong ? `Stávající popis (kontext):\n${input.descriptionLong.slice(0, 2000)}` : ''}

Vygeneruj JSON přesně v tomto schématu:
{
  "tldr": "string max 280 znaků — 2-3 věty co je pro region typické",
  "terroir": {
    "climate": "string 1-2 věty o klimatu",
    "soil": "string 1-2 věty o půdě",
    "tradition": "string 1-2 věty o pěstitelské tradici"
  },
  "faqs": [
    { "question": "...", "answer": "..." }
  ]
}

PRAVIDLA:
- terroir.* — pouze obecně známá fakta o klimatu/půdě regionu, žádné konkrétní statistiky pokud je nemáš
- faqs: 4-6 otázek typu "Je olej z X lepší než Y?", "Co je typický chuťový profil?", "Které odrůdy?", "Jak vybrat?"
- faqs.answer: max 3 věty
- Vrať pouze JSON, nic jiného.`

  const raw = await callClaude(prompt)
  return normalizeRegion(parseJson<Partial<RegionExtrasOutput>>(raw))
}

export async function generateBrandExtras(input: BrandExtrasInput): Promise<BrandExtrasOutput> {
  const prompt = `Značka: ${input.name} (${input.countryName})
Počet olejů: ${input.productCount}
Top produkty:
${formatProducts(input.topProducts)}

${input.foundedYear ? `Založena: ${input.foundedYear}` : ''}
${input.story ? `Příběh: ${input.story.slice(0, 1000)}` : ''}
${input.philosophy ? `Filozofie: ${input.philosophy.slice(0, 500)}` : ''}
${input.descriptionLong ? `Popis (kontext):\n${input.descriptionLong.slice(0, 2000)}` : ''}

Vygeneruj JSON přesně v tomto schématu:
{
  "tldr": "string max 280 znaků — kdo značka je a proč si zaslouží pozornost",
  "timeline": [
    { "year": 1860, "label": "krátký popis milníku", "description": "volitelné rozšíření 1 věta" }
  ],
  "faqs": [
    { "question": "...", "answer": "..." }
  ]
}

PRAVIDLA:
- timeline: 3-5 milníků, POUZE pokud máš jasná data ze story/popisu, jinak prázdné pole
- timeline.label: max 60 znaků (např. "založení rodinné olivárny", "přechod na bio")
- faqs: 4-6 otázek typu "Mají BIO certifikaci?", "Z kterého regionu?", "Jaký je nejlepší olej?", "Kde koupit?"
- faqs.answer: max 3 věty
- Vrať pouze JSON, nic jiného.`

  const raw = await callClaude(prompt)
  return normalizeBrand(parseJson<Partial<BrandExtrasOutput>>(raw))
}

export async function generateCultivarExtras(
  input: CultivarExtrasInput
): Promise<CultivarExtrasOutput> {
  const prompt = `Odrůda: ${input.name}
Počet olejů: ${input.productCount}
Země pěstování: ${input.countriesGrown.join(', ') || 'neuvedeno'}
${input.avgPolyphenols ? `Průměr polyfenolů: ${input.avgPolyphenols} mg/kg` : ''}
Top produkty:
${formatProducts(input.topProducts)}

${input.descriptionLong ? `Popis (kontext):\n${input.descriptionLong.slice(0, 2000)}` : ''}

Vygeneruj JSON přesně v tomto schématu:
{
  "tldr": "string max 280 znaků — jak chutná, kam se hodí, čím je zajímavá",
  "nickname": "string max 60 znaků, charakteristická přezdívka (např. 'apulijský punch', 'krétská něha')",
  "primary_use": "cooking | finishing | dipping | frying | universal",
  "pairing_pros": ["3-5 položek — k čemu se hodí (steaky, luštěniny, ...)"],
  "pairing_cons": ["2-4 položek — k čemu spíš ne (dezerty, jemné ryby, ...)"],
  "faqs": [
    { "question": "...", "answer": "..." }
  ]
}

PRAVIDLA:
- primary_use: pokud nelze rozumně odvodit, vrať "universal"
- pairing_pros / pairing_cons: krátké položky, 2-4 slova každá
- faqs: 4-6 otázek typu "Jak chutná?", "Lze na ní smažit?", "Kde se pěstuje?", "Čím se liší od X?"
- faqs.answer: max 3 věty
- Vrať pouze JSON, nic jiného.`

  const raw = await callClaude(prompt)
  return normalizeCultivar(parseJson<Partial<CultivarExtrasOutput>>(raw))
}
