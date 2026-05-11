// Junk Brand Detector — Fáze 2 master-foundation plánu.
//
// Cíl: vyčistit 125 draft brandů na ~30 skutečných.
//
// Pipeline:
//   1. isJunkBrand(name) — deterministická detekce (no Claude)
//   2. extractProducerName(productId) — Claude Haiku: real producer z raw_description
//   3. reassignAndDeleteJunkBrand(brand) — orchestruje 1+2, re-link products,
//      smaže prázdné, flagne částečně-reassigned pro admin.
//
// Pravidla z user instructions Fáze 2:
//   - Pokud produkt bez source_url → skip + log (nemůžeme re-extract)
//   - Pokud nejistá re-assignment → 'flagged_partial' v tldr markeru
//
// Brand schema: products.brand_slug (NOT brand_id) je vazba.
// Junk marker: brand.tldr začíná "[JUNK]" — admin filter v /admin/brands.

import { supabaseAdmin } from './supabase'
import { callClaude, extractText } from './anthropic'
import { slugify } from './utils'
import { getInjectionBlock } from './learning-injector'
import type { CostTracker } from './cost-tracker'

// ── Blocked words slovník ─────────────────────────────────────────────
// Pokud brand.name (lower-cased) je v setu nebo CONTAINS některé slovo,
// klasifikujeme jako junk. Konzervativně: prefer false-positive nad
// false-negative — admin pak ručně může odznačit.

const BLOCKED_BRAND_WORDS = new Set<string>([
  // Adjektiva (kvalita / typ)
  'olivový', 'olivova', 'olivove', 'olivove', 'olivovy', 'olivovou', 'olivová',
  'prémiový', 'premiovy', 'premium', 'prémiová', 'prémiové',
  'extra', 'panenský', 'panenska', 'panenske', 'panensky',
  'extrapanenský', 'extra-panenský',
  'výrazný', 'vyrazny', 'výrazná', 'výrazné', 'výraznější',
  'jemný', 'jemna', 'jemne', 'jemny',
  'perfektní', 'perfect',
  'hypoalergický', 'hypoalergicky', 'hypoalergicke', 'hypoalergické',
  'nejvyšší', 'nejvyssi',
  'kvalitní', 'kvalitni',

  // Geografická adjektiva (jsou v origin_region, ne brand)
  'toskánský', 'toskansky', 'toskánská', 'toskanska', 'toskánské',
  'italský', 'italsky', 'italská', 'italska', 'italské',
  'řecký', 'recky', 'řecká', 'recka', 'řecké',
  'španělský', 'spanelsky', 'španělská', 'spanelska',
  'chorvatský', 'portugalský',

  // Kategorie produktů
  'dárkový', 'darkovy', 'dárkové', 'darkove', 'dárková', 'darkova',
  'vánoční', 'vanocni',
  'limitovaná', 'limitovany', 'limitovane',
  'sada', 'set',
  'testovací', 'testovaci',
  'health', 'early', 'reserve', 'gold', 'platinum',

  // Obaly / materiály
  'láhev', 'lahev', 'plech', 'plechovka', 'pet',
  'keramická', 'keramicka', 'keramický', 'keramicky',
  'dřevěný', 'dreveny', 'dřevěná', 'drevena',
  'skleněná', 'sklenena', 'skleněný',

  // Příchutě / smíšené produkty
  'lanýžový', 'lanyzovy',
  'rozmarýnový', 'rozmarynovy',
  'pomerančový', 'pomerancovy',
  'uzený', 'uzeny', 'uzená', 'uzena',
  'chilli', 'česnekový', 'cesnekovy',

  // Generic
  'kondicionér', 'kondicioner',
  'dressing',
  'spreji', 'sprej',
  'elixir', 'pons',
  'olej', 'oil', 'olive',
  'bio', 'eko', 'organic',

  // ASCII art / encoding chyby
  'olivov�', 'la', 'grece', 'ena',
])

// Validní brand: alespoň 3 znaky, ne čisté číslo, ne jen unit
function looksLikeUnit(s: string): boolean {
  return /^\d+\s*(ml|l|cl|g|kg|oz)$/i.test(s)
}

export interface JunkCheck {
  isJunk: boolean
  reason?: string
}

/** Deterministická detekce junk brandu. Žádný Claude. */
export function isJunkBrand(brandName: string): JunkCheck {
  const trimmed = brandName.trim()
  const normalized = trimmed.toLowerCase()

  // 1. Prázdné nebo příliš krátké
  if (!normalized || normalized.length < 3) {
    return { isJunk: true, reason: 'Too short' }
  }

  // 2. Encoding artifacts: � nebo "?" v původním názvu (ne legitimní)
  if (trimmed.includes('�')) {
    return { isJunk: true, reason: 'Contains encoding artifact (�)' }
  }

  // 3. Vypadá jako velikost/jednotka
  if (looksLikeUnit(normalized)) {
    return { isJunk: true, reason: 'Looks like volume unit, not brand' }
  }

  // 4. ALL CAPS (asi headline z e-shopu, ne brand) — POZOR jen pro >= 5 znaků,
  //    krátké zkratky typu "DOP" / "BIO" jsou legitimní
  if (
    trimmed === trimmed.toUpperCase() &&
    trimmed.length >= 5 &&
    /[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(trimmed)
  ) {
    // Výjimka: jméno složené ze 2+ slov (zkratky firem např. "DOP UMBRIA"
    // by mohly být legit) — pro 1-token check stricter
    if (trimmed.split(/\s+/).length === 1) {
      return { isJunk: true, reason: `All-uppercase single word (${trimmed}) suggests headline` }
    }
  }

  // 5. Exact match na blocked word
  if (BLOCKED_BRAND_WORDS.has(normalized)) {
    return { isJunk: true, reason: `Exact match on blocked word: "${normalized}"` }
  }

  // 6. Tokenized check — pokud KAŽDÉ slovo v názvu je blocked, je to junk
  //    např. "Italský olivový" → "italsky" + "olivovy" oba blocked
  const tokens = normalized.split(/[\s\-_,]+/).filter(t => t.length > 0)
  if (tokens.length > 0 && tokens.every(t => BLOCKED_BRAND_WORDS.has(t))) {
    return { isJunk: true, reason: `All tokens blocked: ${tokens.join(' + ')}` }
  }

  // 7. Containment check pro jedno-tokenové názvy (např. "Kondicionér")
  if (tokens.length === 1 && BLOCKED_BRAND_WORDS.has(tokens[0])) {
    return { isJunk: true, reason: `Single blocked token: "${tokens[0]}"` }
  }

  return { isJunk: false }
}

// ── Producer extraction (lightweight Claude wrapper) ─────────────────

const PRODUCER_EXTRACTION_SYSTEM = `Jsi extrakční engine pro názvy výrobců olivových olejů.
Z poskytnutého textu (název produktu + raw popis ze scraperu + URL) vrátíš JEDEN
nejlepší tip na skutečné jméno výrobce/značky.

PRAVIDLA:
- Výsledek je VLASTNÍ JMÉNO (Frantoio Muraglia, Ladolea, Chiavalon, Aristeon, Protogerakis).
- NIKDY nevracej generická adjektiva (olivový, prémiový, italský, dressing).
- NIKDY nevracej zemi/region (Itálie, Toskánsko, Apulia).
- NIKDY nevracej obecné typy (extra panenský, EVOO, bio).
- Pokud neumíš identifikovat jasné jméno, vrať null.

Vracíš POUZE validní JSON, žádný markdown:
{
  "producer": "Frantoio Muraglia"   // nebo null pokud nejistý
  "confidence": "high|medium|low",
  "evidence": "kde v textu jsi to našel — max 100 znaků"
}

Confidence:
- high: explicitní "vyrábí X" / "producent: X" / "značka: X" / nebo X je v doméně URL
- medium: jméno se opakuje v textu nebo URL, ale není explicitně označené
- low: jen odhad z kontextu

Pokud confidence < high a evidence není silný, raději vrať null.`

export interface ProducerExtractionResult {
  producer: string | null
  confidence: 'high' | 'medium' | 'low' | null
  evidence: string | null
}

const PRODUCER_MODEL = 'claude-haiku-4-5-20251001'

/** Lehký Claude Haiku call: z raw_description + name + source_url
 *  vytáhne jméno skutečného výrobce.
 *
 *  Cena: ~$0.001 per call (Haiku, ~700 tokens in, ~80 out). */
export async function extractProducerName(
  productId: string,
  costTracker?: CostTracker
): Promise<ProducerExtractionResult & { skipped?: string }> {
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('name, raw_description, source_url')
    .eq('id', productId)
    .maybeSingle()

  if (!product) return { producer: null, confidence: null, evidence: null, skipped: 'product_not_found' }
  if (!product.source_url) {
    return { producer: null, confidence: null, evidence: null, skipped: 'no_source_url' }
  }

  costTracker?.guard()

  const learningsBlock = await getInjectionBlock('fact_extractor')

  const userText = [
    `Název produktu: ${product.name ?? '(unknown)'}`,
    `Source URL: ${product.source_url}`,
    '',
    'Raw popis ze scraperu (zkráceno):',
    (product.raw_description as string | null)?.slice(0, 2000) ?? '(žádný popis)',
  ].join('\n')

  try {
    const res = await callClaude({
      model: PRODUCER_MODEL,
      max_tokens: 200,
      system: `${learningsBlock}${PRODUCER_EXTRACTION_SYSTEM}`,
      messages: [{ role: 'user', content: userText }],
    })

    if (costTracker) {
      costTracker.recordUsage(PRODUCER_MODEL, res.usage)
    }

    const text = extractText(res)
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const parsed = JSON.parse(text) as ProducerExtractionResult

    // Sanity check: producent musí projít isJunkBrand check, jinak zamítnout.
    if (parsed.producer) {
      const check = isJunkBrand(parsed.producer)
      if (check.isJunk) {
        return {
          producer: null,
          confidence: parsed.confidence ?? null,
          evidence: `Claude vrátil junk hodnotu "${parsed.producer}": ${check.reason}`,
        }
      }
    }

    return {
      producer: parsed.producer && parsed.producer.trim().length > 1 ? parsed.producer.trim() : null,
      confidence: parsed.confidence ?? null,
      evidence: parsed.evidence ?? null,
    }
  } catch (err) {
    return {
      producer: null,
      confidence: null,
      evidence: `extract failed: ${err instanceof Error ? err.message : 'unknown'}`,
    }
  }
}

// ── Reassignment + delete pipeline ─────────────────────────────────────

export interface ReassignmentResult {
  brandSlug: string
  brandName: string
  action:
    | 'deleted_empty'              // junk brand bez produktů → smazáno
    | 'deleted_after_reassign'     // všechny produkty re-přiřazeny → smazáno
    | 'flagged_partial'            // některé re-přiřazeny, junk brand zůstává s [JUNK] markerem
    | 'flagged_no_extraction'      // žádný produkt nelze re-extract → flagne
    | 'kept_not_junk'              // při second-look check NENÍ junk (false positive)
  productCount: number
  reassigned: number
  failed: number
  skippedNoSourceUrl: number
  errors: string[]
}

interface BrandRow {
  id: string
  slug: string
  name: string
  status: string
}

interface ProductRow {
  id: string
  source_url: string | null
  name: string | null
}

/** Pro daný junk brand: re-extract producent pro každý produkt, re-link,
 *  smaž junk brand pokud OK. Bezpečné — žádný produkt neztratí brand_slug
 *  bez existujícího náhradního brandu. */
export async function reassignAndDeleteJunkBrand(
  junkBrand: BrandRow,
  costTracker?: CostTracker
): Promise<ReassignmentResult> {
  const errors: string[] = []
  const result: ReassignmentResult = {
    brandSlug: junkBrand.slug,
    brandName: junkBrand.name,
    action: 'flagged_partial',
    productCount: 0,
    reassigned: 0,
    failed: 0,
    skippedNoSourceUrl: 0,
    errors,
  }

  // Defense-in-depth: znovu zkontroluj že je opravdu junk. Někdo mohl
  // mezi-tím přejmenovat.
  const recheck = isJunkBrand(junkBrand.name)
  if (!recheck.isJunk) {
    result.action = 'kept_not_junk'
    return result
  }

  // 1. Najdi produkty pod tímto junk brandem (vazba je brand_slug)
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, source_url, name')
    .eq('brand_slug', junkBrand.slug)

  const ps = (products ?? []) as ProductRow[]
  result.productCount = ps.length

  if (ps.length === 0) {
    // Prázdný junk brand → bezpečně smazat
    const { error } = await supabaseAdmin.from('brands').delete().eq('id', junkBrand.id)
    if (error) errors.push(`delete empty: ${error.message}`)
    else result.action = 'deleted_empty'
    return result
  }

  // 2. Pro každý produkt re-extract producer
  const successfulReassigns: Array<{ productId: string; correctBrandSlug: string }> = []

  for (const product of ps) {
    if (!product.source_url) {
      result.skippedNoSourceUrl++
      result.failed++
      continue
    }

    try {
      const extraction = await extractProducerName(product.id, costTracker)
      if (extraction.skipped) {
        result.skippedNoSourceUrl++
        result.failed++
        continue
      }
      if (!extraction.producer || extraction.confidence === 'low') {
        result.failed++
        continue
      }

      // Najdi nebo vytvoř správný brand
      const correctBrand = await findOrCreateBrand(extraction.producer)
      if (!correctBrand) {
        result.failed++
        errors.push(`failed to find/create brand for "${extraction.producer}"`)
        continue
      }
      if (correctBrand.slug === junkBrand.slug) {
        // Stejný slug — nelze re-link sám na sebe (Claude vrátil totéž slovo)
        result.failed++
        continue
      }

      successfulReassigns.push({ productId: product.id, correctBrandSlug: correctBrand.slug })
    } catch (err) {
      result.failed++
      errors.push(`product ${product.id}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  // 3. Provést re-link
  for (const { productId, correctBrandSlug } of successfulReassigns) {
    const { error } = await supabaseAdmin
      .from('products')
      .update({ brand_slug: correctBrandSlug, updated_at: new Date().toISOString() })
      .eq('id', productId)
    if (error) {
      result.failed++
      errors.push(`relink ${productId}: ${error.message}`)
    } else {
      result.reassigned++
    }
  }

  // 4. Smaž junk brand POUZE pokud všechny produkty byly OK re-přiřazeny
  if (result.failed === 0 && result.reassigned === ps.length) {
    const { error } = await supabaseAdmin.from('brands').delete().eq('id', junkBrand.id)
    if (error) {
      errors.push(`final delete: ${error.message}`)
    } else {
      result.action = 'deleted_after_reassign'
    }
  } else if (result.reassigned === 0) {
    // Žádný produkt nelze re-extract → flagne pro admina, neudělej žádnou změnu
    await markBrandAsJunk(
      junkBrand.id,
      `Žádný z ${ps.length} produktů nelze automaticky re-přiřadit (${result.skippedNoSourceUrl} bez source_url, ${result.failed} extraction selhalo)`
    )
    result.action = 'flagged_no_extraction'
  } else {
    // Částečně OK — některé re-přiřazeny, některé ne. Junk brand zůstává s markerem.
    await markBrandAsJunk(
      junkBrand.id,
      `Částečně re-přiřazeno: ${result.reassigned}/${ps.length} OK, ${result.failed} selhalo. Admin musí ručně rozhodnout o zbývajících produktech.`
    )
    result.action = 'flagged_partial'
  }

  return result
}

/** Najdi brand podle slugu (slugify(producerName)), nebo vytvoř nový draft.
 *  Vrací null pokud insert selže (např. constraint violation). */
async function findOrCreateBrand(producerName: string): Promise<{ id: string; slug: string } | null> {
  const slug = slugify(producerName)
  if (!slug || slug.length < 2) return null

  // Existující?
  const { data: existing } = await supabaseAdmin
    .from('brands')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return { id: existing.id as string, slug: existing.slug as string }
  }

  // Vytvoř nový — draft, čeká na brand-research nebo admin
  const { data: created, error } = await supabaseAdmin
    .from('brands')
    .insert({
      slug,
      name: producerName,
      status: 'draft',
    })
    .select('id, slug')
    .maybeSingle()

  if (error || !created) return null
  return { id: created.id as string, slug: created.slug as string }
}

/** Označ brand jako junk: status zůstává 'draft', ale tldr dostane [JUNK] prefix.
 *  Admin pak v /admin/brands může filtrovat podle tldr ILIKE '[JUNK]%'. */
async function markBrandAsJunk(brandId: string, note: string): Promise<void> {
  const marker = `[JUNK] ${note}`.slice(0, 280)
  const { error } = await supabaseAdmin
    .from('brands')
    .update({
      tldr: marker,
      status: 'draft', // explicit — nezvedat na active
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandId)
  if (error) console.warn(`[junk-brand] mark as junk failed for ${brandId}:`, error.message)
}

// ── Bulk audit + execution ──────────────────────────────────────────────

export interface JunkCleanupSummary {
  totalBrandsScanned: number
  totalDraftBrands: number
  junkDetected: number
  totalProductsTouched: number
  deletedEmpty: number
  deletedAfterReassign: number
  flaggedPartial: number
  flaggedNoExtraction: number
  keptNotJunk: number
  totalReassigned: number
  totalFailed: number
  totalSkippedNoSourceUrl: number
  results: ReassignmentResult[]
}

/** Spusť cleanup nad všemi draft brandy. Zastaví se při hard cost limitu.
 *  options.dryRun = true: detekuje + simuluje, ale nemaže/nemění DB. */
export async function runJunkBrandCleanup(options: {
  costTracker: CostTracker
  dryRun?: boolean
  limit?: number // pro testování — process jen N brandů
  onProgress?: (i: number, total: number, result: ReassignmentResult) => void
}): Promise<JunkCleanupSummary> {
  const { costTracker, dryRun = false, limit, onProgress } = options

  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, status')
    .eq('status', 'draft')

  const allDrafts = (brands ?? []) as BrandRow[]
  const summary: JunkCleanupSummary = {
    totalBrandsScanned: allDrafts.length,
    totalDraftBrands: allDrafts.length,
    junkDetected: 0,
    totalProductsTouched: 0,
    deletedEmpty: 0,
    deletedAfterReassign: 0,
    flaggedPartial: 0,
    flaggedNoExtraction: 0,
    keptNotJunk: 0,
    totalReassigned: 0,
    totalFailed: 0,
    totalSkippedNoSourceUrl: 0,
    results: [],
  }

  const junkBrands = allDrafts.filter(b => isJunkBrand(b.name).isJunk)
  summary.junkDetected = junkBrands.length

  const processList = limit ? junkBrands.slice(0, limit) : junkBrands

  for (let i = 0; i < processList.length; i++) {
    const brand = processList[i]
    try {
      costTracker.guard()
    } catch {
      console.warn(`[junk-cleanup] cost limit reached, stopping at brand ${i}/${processList.length}`)
      break
    }

    let result: ReassignmentResult
    if (dryRun) {
      // Dry-run: jen spočítej produkty pod brandem, nemaž
      const { count } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('brand_slug', brand.slug)
      result = {
        brandSlug: brand.slug,
        brandName: brand.name,
        action: count && count > 0 ? 'flagged_partial' : 'deleted_empty',
        productCount: count ?? 0,
        reassigned: 0,
        failed: 0,
        skippedNoSourceUrl: 0,
        errors: ['DRY RUN — žádné změny v DB'],
      }
    } else {
      result = await reassignAndDeleteJunkBrand(brand, costTracker)
    }

    summary.results.push(result)
    summary.totalProductsTouched += result.productCount
    summary.totalReassigned += result.reassigned
    summary.totalFailed += result.failed
    summary.totalSkippedNoSourceUrl += result.skippedNoSourceUrl

    if (result.action === 'deleted_empty') summary.deletedEmpty++
    else if (result.action === 'deleted_after_reassign') summary.deletedAfterReassign++
    else if (result.action === 'flagged_partial') summary.flaggedPartial++
    else if (result.action === 'flagged_no_extraction') summary.flaggedNoExtraction++
    else if (result.action === 'kept_not_junk') summary.keptNotJunk++

    onProgress?.(i, processList.length, result)
  }

  return summary
}
