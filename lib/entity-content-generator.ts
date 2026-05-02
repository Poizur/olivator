// AI content generator for region / brand / cultivar entity pages.
// Generates Czech editorial text (600–2000 words depending on entity type).
// Uses claude-sonnet-4-20250514; all calls have retry with exponential backoff.

import { callClaude as callClaudeShared, extractText } from './anthropic'
import { applyCzechTypographyFixes } from './czech-style'

const MODEL = 'claude-sonnet-4-20250514'

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const res = await callClaudeShared({
    model: MODEL,
    max_tokens: maxTokens,
    system: ENTITY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })
  return applyCzechTypographyFixes(extractText(res).trim()).fixed
}

const ENTITY_SYSTEM_PROMPT = `Jsi hlavní editor Olivator.cz — největšího srovnávače olivových olejů v ČR.
Piš přirozenou češtinou, aktivním hlasem, přítomným časem.
Tón: chytrý kamarád sommelier, který ví co říká a nepotřebuje nafouknout text chvalozpěvy.

PRAVIDLA:
- Piš POUZE co víš ze zadaného kontextu. Nefabrikuj historická data, ocenění, geografická specifika.
- Nepoužívej: "prémiový", "výjimečný", "ideální volba", "perfektní", "patří mezi nejlepší".
- Konkrétní čísla > adjektiva (polyfenoly 800 mg/kg > "velmi zdravý").
- Podepiš každou větu faktem — kyselost, polyfenoly, certifikace, odrůda, region.
- Formát: čistý text s odstavci. Nadpisy začínají ## (H2) nebo ### (H3).
- Minimálně 2× H2, min. 1× přirozené affiliate CTA ("Nejlevněji u X: YYY Kč").
- Nepoužívej markdown bold/italic.

EVERGREEN PRAVIDLO (KRITICKÉ):
- Texty popisují REGION/ZNAČKU/ODRŮDU obecně, NE aktuální stav našeho katalogu.
- ZAKÁZÁNO: "v naší nabídce", "v našem katalogu", "v našem výběru", "u nás máte na výběr",
  "aktuálně nabízíme", "nemáme/máme bio certifikace".
- Důvod: katalog se mění týden po týdnu. Text musí platit i za měsíc.
- ✅ "Apulijské oleje typicky nesou DOP certifikaci u prémiových řad."
- ❌ "Apulijské oleje v našem katalogu nenesou DOP certifikaci."`

// ── Region ────────────────────────────────────────────────────────────────────

export interface RegionContentInput {
  name: string           // "Peloponés"
  countryCode: string    // "GR"
  countryName: string    // "Řecko"
  productCount: number
  topProducts: Array<{
    name: string
    olivatorScore: number
    acidity: number | null
    polyphenols: number | null
    certifications: string[]
    cheapestPrice: number | null
    slug: string
  }>
  commonCultivars: string[]   // ["Koroneiki", "Manaki"]
}

export async function generateRegionContent(input: RegionContentInput): Promise<string> {
  // EVERGREEN: Žádné konkrétní produkty z aktuálního katalogu — text musí
  // být platný i za měsíc když přijdou nové oleje. Tabulka produktů na
  // stránce je primary source produktových dat, text dodává regionální kontext.

  // Aggregovaná data — počty, ne konkrétní produkty:
  const cultivarSummary = input.commonCultivars.length > 0
    ? input.commonCultivars.slice(0, 4).join(', ')
    : 'různé'

  // Agregované certifikace napříč all top produkty (jen jako "v regionu se vyskytuje")
  const certSet = new Set<string>()
  for (const p of input.topProducts.slice(0, 10)) {
    for (const c of p.certifications) certSet.add(c)
  }
  const certsInRegion = certSet.size > 0
    ? Array.from(certSet).slice(0, 5).join(', ')
    : 'běžné EU standardy'

  // Polyfenol range (min-max z top produktů)
  const polyVals = input.topProducts
    .map((p) => p.polyphenols)
    .filter((v): v is number => v != null && v > 0)
  const polyRange = polyVals.length >= 2
    ? `${Math.min(...polyVals)}–${Math.max(...polyVals)} mg/kg`
    : polyVals.length === 1
    ? `kolem ${polyVals[0]} mg/kg`
    : 'v běžném rozmezí'

  const prompt = `Napiš editorial obsah o regionu "${input.name}" (${input.countryName}) pro Olivator.cz.

Kontext (jen pro orientaci, NEJMENUJ konkrétní produkty):
- Region: ${input.name}, země: ${input.countryName}
- Typické odrůdy v regionu: ${cultivarSummary}
- Certifikace co se v regionu vyskytují: ${certsInRegion}
- Polyfenoly typicky: ${polyRange}

ZAKÁZÁNO:
- Jmenovat konkrétní produkty / značky / SKUs (od toho je tabulka výš na stránce)
- Frází "v naší nabídce", "u nás v katalogu", "máme k dispozici"
- Konkrétní ceny ("od 280 Kč")
- Linky na /olej/... slug
- Frází "nejlepší oleje z ${input.name}" (tabulka už je seřazená podle Score)

POVINNÉ:
- Psát o REGIONU SAMOTNÉM — geografie, klima, půda, historie pěstování
- Psát o ODRŮDÁCH jako koncept (charakteristiky, ne produkty)
- Psát o CERTIFIKACÍCH jako koncept (co znamená DOP/PGP v daném regionu)
- Psát o GASTRONOMII regionu (s čím se olej tradičně používá)
- Důraz na to co dělá region UNIKÁTNÍM (specifické geo, klima, tradice, slavné olivovníky, sklizňové zvyky)

Délka: 600–900 slov (krátké je lepší — tabulka už ukazuje data).

Struktura (přesně 4 H2 sekce, každá 100–200 slov):
- Úvodní odstavec (1 odstavec, 80–120 slov, lead že to je za region)
- ## Krajina a klima (geografie, půda, počasí, jak ovlivňuje pěstování)
- ## Tradice pěstování (historie, sklizeň, hutní tradice, slavné lokality)
- ## Odrůdy a chuť (jaké odrůdy se tu pěstují, jak chutnají typicky)
- ## Co region dělá unikátním (1-2 specifické věci — UNESCO chráněné olivovníky, místní gastronomické tradice, certifikace specificky pro region)

Tón: chytrý kamarád sommelier, faktický, žádné salesy. Žádné "prémiový", "nezapomenutelný", "dokonalý".

Výstup: čistý text s ## H2 nadpisy. Žádné JSON, markdown bold/italic, code blocks.`

  return callClaude(prompt, 1800)
}

// ── Brand ─────────────────────────────────────────────────────────────────────

export interface BrandContentInput {
  name: string
  countryCode: string
  countryName: string
  regionName: string | null
  productCount: number
  topProducts: Array<{
    name: string
    olivatorScore: number
    acidity: number | null
    polyphenols: number | null
    certifications: string[]
    cheapestPrice: number | null
    slug: string
  }>
  commonCultivars: string[]
}

export async function generateBrandContent(input: BrandContentInput): Promise<string> {
  // EVERGREEN: text o značce jako entitě (historie, filozofie, styl), ne o
  // aktuálních produktech. Sortiment se mění, certifikace přidávají, ceny mění.

  const cultivars = input.commonCultivars.length > 0
    ? input.commonCultivars.slice(0, 4).join(', ')
    : 'tradiční odrůdy regionu'

  // Agregované certifikace značky
  const certSet = new Set<string>()
  for (const p of input.topProducts) {
    for (const c of p.certifications) certSet.add(c)
  }
  const brandCerts = certSet.size > 0
    ? Array.from(certSet).join(', ')
    : 'standardní EU označení'

  const prompt = `Napiš editorial obsah o olivářské značce "${input.name}" pro Olivator.cz.

Kontext (NEJMENUJ konkrétní SKUs / produkty / ceny):
- Sídlo: ${input.regionName ? `${input.regionName}, ` : ''}${input.countryName}
- Pracuje s odrůdami: ${cultivars}
- Certifikace u značky: ${brandCerts}

ZAKÁZÁNO:
- Jmenovat konkrétní produktové názvy (od toho je tabulka výš)
- Konkrétní ceny ("od 280 Kč")
- Frází "nejlepší produkty od X" (tabulka už řadí podle Score)
- Linky na /olej/... slug
- "V našem katalogu", "u nás máme"

POVINNÉ — psát o značce jako o ENTITĚ:
- Kde sídlí, v jakém regionu (geografický kontext)
- Jaký styl oleje vyrábí (typicky — moderní filtrovaný / tradiční nefiltrovaný / single estate atd.)
- Filozofie pokud je veřejně známá (rodinná × industrial, organic, single varietal vs blends)
- Jak se značka pozná: charakteristické rysy oleje (intenzita, profile, balení)
- Kontext regionu (země, klima, sklizňové zvyky)

Délka: 400–600 slov (krátké je lepší).

Struktura (3 H2 sekce):
- Úvodní odstavec (1 odstavec, kdo to je a kde sídlí)
- ## Styl a filozofie (jaký olej dělají a jak)
- ## Region a tradice (kontext odkud pochází)
- ## Co od značky čekat (chuťový profil, certifikace jako koncept, sezónnost)

Tón: chytrý kamarád sommelier, faktický. Pokud nemáš ověřená data o historii/zakladatelích, NEPIŠ je. Lepší je krátší pravdivý text než dlouhý nafouknutý.

Výstup: čistý text s ## H2. Žádné JSON, markdown bold/italic, kódové bloky.`

  return callClaude(prompt, 1200)
}

// ── Cultivar ──────────────────────────────────────────────────────────────────

export interface CultivarContentInput {
  name: string
  originRegions: string[]    // regions where it grows
  typicalAcidity: string     // e.g. "0.2–0.4 %"
  typicalPolyphenols: string // e.g. "400–800 mg/kg"
  flavorProfile: string      // e.g. "ovocný, mírně hořký, bylinkový"
  productCount: number
  topProducts: Array<{
    name: string
    olivatorScore: number
    cheapestPrice: number | null
    slug: string
  }>
}

export async function generateCultivarContent(input: CultivarContentInput): Promise<string> {
  // EVERGREEN: odrůda je botanická entita — je stejná dnes jako za rok.
  // Konkrétní produkty co v katalogu existují se nezmiňují.

  const prompt = `Napiš editorial obsah o odrůdě olivovníku "${input.name}" pro Olivator.cz.

Kontext (NEJMENUJ konkrétní produkty / značky / ceny):
- Hlavní pěstitelské regiony: ${input.originRegions.join(', ') || 'různé'}
- Typická kyselost: ${input.typicalAcidity}
- Typické polyfenoly: ${input.typicalPolyphenols}
- Chuťový profil: ${input.flavorProfile}

ZAKÁZÁNO:
- Jmenovat konkrétní produkty / značky / SKUs (od toho je tabulka výš)
- Konkrétní ceny
- Frází "nejlepší ${input.name} v ČR / v našem katalogu" (tabulka už řadí)
- Linky na /olej/... slug
- "V naší nabídce", "u nás máte"

POVINNÉ — psát o odrůdě jako o BOTANICKÉ ENTITĚ:
- Kde se odrůda pěstuje (geografie)
- Botanický původ (pokud znáš — kdy/kde objevena, kdo ji uznal)
- Jaký olej z ní typicky vznikne (profile, intenzita, hořkost, pálení)
- Jak se liší od jiných známých odrůd (Coratina vs Picual, Koroneiki vs Arbequina atd.)
- Kdy sklizet pro různé profile (early harvest = pikantní, late = jemný)
- S čím se v gastronomii pojí (typická jídla, kuchyně)
- Health angle z polyfenolů (ale faktický — ne vágní "zdravý")

Délka: 500–700 slov.

Struktura (3 H2 sekce):
- Úvodní odstavec (1 odstavec, představení odrůdy + region)
- ## Botanika a pěstování (kde, jak, kdy sklizeň)
- ## Chuťový profil (typická senzorika, intenzita, párování)
- ## Co dělá odrůdu unikátní (charakteristika která ji odlišuje od jiných)

Tón: chytrý kamarád sommelier, faktický. Žádné "prémiový", "nejlepší", chvalozpěvy.

Výstup: čistý text s ## H2. Bez JSON, bez markdown bold/italic, bez kódových bloků.`

  return callClaude(prompt, 1500)
}
