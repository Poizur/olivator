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
- Nepoužívej markdown bold/italic.`

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
  const productLines = input.topProducts
    .slice(0, 5)
    .map(
      (p) =>
        `- ${p.name} | Score ${p.olivatorScore} | kyselost ${p.acidity ?? '?'}% | polyfenoly ${p.polyphenols ?? '?'} mg/kg | cert: ${p.certifications.join(', ') || 'žádné'} | od ${p.cheapestPrice ?? '?'} Kč`,
    )
    .join('\n')

  const prompt = `Napiš editorial stránku o regionu "${input.name}" (${input.countryName}) pro Olivator.cz.

Kontext:
- Počet produktů v katalogu: ${input.productCount}
- Odrůdy: ${input.commonCultivars.join(', ') || 'neznámé'}
- Top produkty:
${productLines}

Požadavky:
- Délka: 1200–1800 slov
- Struktura: úvod (2 odstavce) → ## Typický chuťový profil → ## Certifikace a standardy → ## Odrůdy tohoto regionu → ## Nejlepší olivové oleje z ${input.name} → ## Jak vybrat olej z ${input.name}
- Sekce s produkty: seřadit podle Olivator Score, každý produkt 2–3 věty, přirozené CTA na /olej/[slug]
- Piš pouze o faktických datech výše — nefabrikuj historii ani geologii

Výstup: čistý text (žádný JSON ani obal).`

  return callClaude(prompt, 2500)
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
  const productLines = input.topProducts
    .slice(0, 6)
    .map(
      (p) =>
        `- ${p.name} | Score ${p.olivatorScore} | kyselost ${p.acidity ?? '?'}% | polyfenoly ${p.polyphenols ?? '?'} mg/kg | cert: ${p.certifications.join(', ') || 'žádné'} | od ${p.cheapestPrice ?? '?'} Kč`,
    )
    .join('\n')

  const prompt = `Napiš editorial stránku o značce "${input.name}" pro Olivator.cz.

Kontext:
- Původ: ${input.regionName ? `${input.regionName}, ` : ''}${input.countryName}
- Produkty v katalogu: ${input.productCount}
- Odrůdy: ${input.commonCultivars.join(', ') || 'neznámé'}
- Produkty:
${productLines}

Požadavky:
- Délka: 600–900 slov
- Struktura: úvod (co značka dělá, kde sídlí, jaký styl oleji) → ## Produktová řada → ## Olivator hodnocení → ## Kde koupit
- Každý produkt 2–3 věty s čísly (Score, kyselost, polyfenoly), přirozené CTA na /olej/[slug]
- Piš pouze o faktech výše — nefabrikuj příběh ani historii

Výstup: čistý text.`

  return callClaude(prompt, 1500)
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
  const productLines = input.topProducts
    .slice(0, 5)
    .map((p) => `- ${p.name} | Score ${p.olivatorScore} | od ${p.cheapestPrice ?? '?'} Kč → /olej/${p.slug}`)
    .join('\n')

  const prompt = `Napiš editorial stránku o odrůdě olivovníku "${input.name}" pro Olivator.cz.

Kontext:
- Regiony: ${input.originRegions.join(', ') || 'různé'}
- Typická kyselost: ${input.typicalAcidity}
- Typické polyfenoly: ${input.typicalPolyphenols}
- Chuťový profil: ${input.flavorProfile}
- Produktů v katalogu: ${input.productCount}
- Top produkty:
${productLines}

Požadavky:
- Délka: 800–1200 slov
- Struktura: úvod (co je to za odrůdu, kde roste) → ## Chuťový profil → ## Zdravotní hodnota (polyfenoly, kyselost) → ## Jak se liší od jiných odrůd → ## Nejlepší ${input.name} v ČR
- Přirozené CTA na /olej/[slug]
- Piš pouze na základě faktů výše

Výstup: čistý text.`

  return callClaude(prompt, 1800)
}
