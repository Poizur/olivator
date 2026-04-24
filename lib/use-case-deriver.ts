// Derive use cases (salad / cooking / frying / dipping / fish / meat / gift / health)
// automatically from product data. No LLM needed — pure function.
//
// Rationale: every quality EVOO works for "everything", so manual tagging is noise.
// Useful categorization comes from flavor profile + chemistry + price + oil type:
//   - Refined oils / pomace → frying-friendly (high smoke point)
//   - EVOO with high polyphenols → raw use preferred (heat destroys antioxidants)
//   - Mild + low bitter → fish, salad, dipping
//   - Robust (spicy + bitter) → meat, grilling, bread dipping
//   - Expensive + quality packaging → gift
//
// Output is same shape as existing products.use_cases field, so frontend doesn't change.

export interface DeriveInput {
  type: string | null              // 'evoo' | 'virgin' | 'refined' | 'olive_oil' | 'pomace'
  acidity: number | null           // %
  polyphenols: number | null       // mg/kg
  flavorProfile: {
    fruity?: number
    herbal?: number
    bitter?: number
    spicy?: number
    mild?: number
    nutty?: number
    buttery?: number
  } | null
  pricePerLiter: number | null     // CZK/L
  packaging: string | null         // 'dark_glass' | 'tin' | 'pet'
  certifications: string[]
}

export interface DeriveResult {
  useCases: string[]               // machine tags — backward compat with existing code
  summary: string                  // 1 sentence human Czech — for product card
  reasoning: string[]              // explanations per tag, for debugging
}

export function deriveUseCases(input: DeriveInput): DeriveResult {
  const tags = new Set<string>()
  const reasoning: string[] = []
  const flavor = input.flavorProfile ?? {}
  const mild = flavor.mild ?? 50
  const bitter = flavor.bitter ?? 50
  const spicy = flavor.spicy ?? 50
  const fruity = flavor.fruity ?? 50

  const isRefined = input.type === 'refined' || input.type === 'olive_oil' || input.type === 'pomace'
  const isEvoo = input.type === 'evoo' || input.type === 'virgin'
  const highPolyphenols = (input.polyphenols ?? 0) >= 300
  const lowAcidity = (input.acidity ?? 1) <= 0.4
  const isMild = mild > 55 && bitter < 40 && spicy < 40
  const isRobust = (bitter + spicy) / 2 > 55 || bitter > 60 || spicy > 60

  // ── Frying — only refined, or lower-quality EVOO with moderate polyphenols ──
  if (isRefined) {
    tags.add('frying')
    tags.add('cooking')
    reasoning.push('frying: rafinovaný olej snese vysoké teploty (kouřový bod ~230 °C)')
  } else if (isEvoo && !highPolyphenols) {
    // mid-range EVOO — OK for moderate heat
    tags.add('cooking')
    reasoning.push('cooking: EVOO s nižšími polyfenoly — snese teplotu do 180 °C')
  }

  // ── Raw use (salad, dipping, fish) — high-quality EVOO, cold kitchen ──
  if (isEvoo && (isMild || highPolyphenols || lowAcidity)) {
    tags.add('salad')
    reasoning.push('salad: EVOO s jemnou chutí — ideální do salátů bez přebíjení')

    // Dipping needs either mild (bread-friendly) or robust (peppery bread oil)
    tags.add('dipping')
    reasoning.push('dipping: EVOO vhodný na pokapání chleba / dipping')
  }

  // ── Fish — mild oils only (robust overwhelms delicate flavors) ──
  if (isEvoo && isMild) {
    tags.add('fish')
    reasoning.push('fish: jemný olej nepřebíjí delikátní chuť ryb')
  }

  // ── Meat — robust oils (peppery, bitter) ──
  if (isEvoo && isRobust) {
    tags.add('meat')
    reasoning.push('meat: výrazný olej s pálivostí — hodí se na maso a grilování')
  }

  // ── Health — only real EVOO with high polyphenols (EU claim: ≥250 mg/kg) ──
  if (isEvoo && (input.polyphenols ?? 0) >= 250) {
    tags.add('health')
    reasoning.push(`health: polyfenoly ${input.polyphenols} mg/kg — splňuje EU health claim (≥250)`)
  }

  // ── Gift — premium-ish price + nice packaging ──
  const pricePerL = input.pricePerLiter ?? 0
  const hasNicePackaging = input.packaging === 'dark_glass' || input.packaging === 'tin'
  const hasPrestigeCerts = input.certifications.some(c => c === 'dop' || c === 'nyiooc' || c === 'demeter')
  if (pricePerL >= 450 && hasNicePackaging) {
    tags.add('gift')
    reasoning.push(`gift: cena ${pricePerL} Kč/l + kvalitní obal`)
  } else if (hasPrestigeCerts && hasNicePackaging) {
    tags.add('gift')
    reasoning.push('gift: prestižní certifikace (DOP/NYIOOC/Demeter) + obal')
  }

  // ── Fallback: if we derived nothing, add 'cooking' + 'salad' as safe defaults ──
  if (tags.size === 0) {
    tags.add('cooking')
    tags.add('salad')
    reasoning.push('fallback: chybí data, přiřazeno salad + cooking')
  }

  // Generate human-readable summary in Czech
  const summary = buildSummary(tags, input, isMild, isRobust)

  return {
    useCases: Array.from(tags),
    summary,
    reasoning,
  }
}

function buildSummary(
  tags: Set<string>,
  input: DeriveInput,
  isMild: boolean,
  isRobust: boolean
): string {
  const parts: string[] = []

  if (tags.has('frying')) parts.push('smažení a pečení')
  if (tags.has('cooking') && !tags.has('frying')) parts.push('teplou kuchyni do 180 °C')

  if (tags.has('salad')) {
    if (isMild) parts.push('jemné saláty')
    else if (isRobust) parts.push('výrazné saláty s grilovanou zeleninou')
    else parts.push('saláty')
  }

  if (tags.has('fish')) parts.push('ryby a mořské plody')
  if (tags.has('meat')) parts.push('maso a grilování')
  if (tags.has('dipping')) parts.push('pokapání chleba')
  if (tags.has('health') && (input.polyphenols ?? 0) >= 250) {
    parts.push(`studenou kuchyni s benefitem antioxidantů (${input.polyphenols} mg/kg polyfenolů)`)
  }

  if (parts.length === 0) return 'Univerzální olivový olej pro každodenní vaření.'

  const joined = parts.length === 1 ? parts[0]
    : parts.length === 2 ? `${parts[0]} a ${parts[1]}`
    : parts.slice(0, -1).join(', ') + ' a ' + parts[parts.length - 1]

  const prefix = input.type === 'evoo' ? 'Hodí se na' : 'Vhodný na'
  const giftNote = tags.has('gift') ? ' Díky obalu a kvalitě se hodí jako dárek.' : ''

  return `${prefix} ${joined}.${giftNote}`
}
