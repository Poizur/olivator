// Brand auto-fill orchestrator — od A do Z plně automatický pipeline.
//
// Stage 1: Najdi web výrobce (lib/brand-url-finder)
// Stage 2: Stáhni data + extrahuj JSON (lib/brand-research)
// Stage 3: Cross-check že je to opravdu naše značka (Claude verify)
// Stage 4: Polish do češtiny (Claude Sonnet) — finální draft
// Stage 5: Apply do brand row + uloží logo do entity_images
//
// Vrací AutoFillReport — confidence, status, applied fields. Při low confidence
// (< MIN_APPLY_CONFIDENCE) NIC neukládá do brand row, jen vrátí návrh.

import { supabaseAdmin } from './supabase'
import { callClaude, extractText } from './anthropic'
import { findProducerUrl, type ProducerUrlCandidate } from './brand-url-finder'
import { researchBrand, type BrandResearchResult } from './brand-research'

export const MIN_APPLY_CONFIDENCE = 75

export type AutoFillStatus =
  | 'applied' // confidence dostatečná, vše uloženo
  | 'pending_review' // našel data ale confidence < threshold, draft uložen
  | 'no_url' // URL finder selhal
  | 'rejected' // verify Claude řekl "to není naše značka"
  | 'error'

export interface PolishedDraft {
  tldr: string | null
  descriptionShort: string | null
  descriptionLong: string | null
  story: string | null
  philosophy: string | null
  foundedYear: number | null
  headquarters: string | null
  websiteUrl: string | null
  timeline: Array<{ year: number; label: string }>
  metaTitle: string | null
  metaDescription: string | null
}

export interface AutoFillReport {
  brandSlug: string
  status: AutoFillStatus
  candidate: ProducerUrlCandidate | null
  scrapedRaw: BrandResearchResult | null
  verification: VerifyResult | null
  polished: PolishedDraft | null
  appliedFields: string[]
  logoSaved: boolean
  galleryAdded: number
  message: string
}

interface VerifyResult {
  verified: boolean
  confidence: number
  reason: string
}

interface BrandRow {
  id: string
  slug: string
  name: string
  country_code: string | null
}

// ────────────────────────────────────────────────────────────────────
// Stage 3 — Verify
// ────────────────────────────────────────────────────────────────────
const VERIFY_SYSTEM = `Jsi cross-check asistent. Tvoje úloha: rozhodnout zda
URL kandidát je OPRAVDU oficiální výrobce značky kterou hledáme.

KRITÉRIA (sčítáš body, max 100):
- Web zmiňuje olivový olej (ne kosmetiku, ne víno) ........ +20
- Doména/H1/title obsahuje brand name ..................... +25
- Region nebo sídlo se shoduje s našimi daty .............. +20
- Web zmiňuje konkrétní produkt z naší DB ................. +25
- Web vypadá jako výrobce (lis, farma, rodina), ne retailer +10

Pokud confidence < 60: verified = false (nelze ověřit, raději neaplikovat).

VÝSTUP — POUZE validní JSON:
{
  "verified": true,
  "confidence": 85,
  "reason": "Krátké zdůvodnění (max 1 věta)."
}`

async function verifyBrand(args: {
  brand: BrandRow
  candidateUrl: string
  scraped: BrandResearchResult
  productNames: string[]
  productRegions: string[]
}): Promise<VerifyResult> {
  const userMsg = [
    `Hledáme oficiální web výrobce značky:`,
    `- Jméno: ${args.brand.name}`,
    `- Země: ${args.brand.country_code ?? '(neznámá)'}`,
    `- Naše produkty: ${args.productNames.slice(0, 5).join(', ') || '(žádné)'}`,
    `- Regiony produktů: ${[...new Set(args.productRegions)].slice(0, 3).join(', ') || '(žádné)'}`,
    ``,
    `Kandidát URL: ${args.candidateUrl}`,
    ``,
    `Co Claude vytáhl ze stránky:`,
    `- Sídlo: ${args.scraped.headquarters ?? '(nenalezeno)'}`,
    `- Rok založení: ${args.scraped.foundedYear ?? '(nenalezeno)'}`,
    `- Krátký popis: ${args.scraped.descriptionShort ?? '(nenalezeno)'}`,
    `- Story: ${(args.scraped.story ?? '').slice(0, 800)}`,
    `- Philosophy: ${(args.scraped.philosophy ?? '').slice(0, 400)}`,
    `- Certifikace: ${args.scraped.certifications.join(', ') || '(žádné)'}`,
    ``,
    `Vrať JSON dle schématu.`,
  ].join('\n')

  try {
    const response = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: VERIFY_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })
    const raw = extractText(response).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    const match = raw.match(/\{[\s\S]*\}/)
    const jsonStr = match ? match[0] : raw
    const parsed = JSON.parse(jsonStr) as Partial<VerifyResult>
    return {
      verified: typeof parsed.verified === 'boolean' ? parsed.verified : false,
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, parsed.confidence)) : 0,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 400) : '',
    }
  } catch (err) {
    console.error('[brand-auto-fill] verify failed:', err)
    return { verified: false, confidence: 0, reason: 'Verify Claude call failed' }
  }
}

// ────────────────────────────────────────────────────────────────────
// Stage 4 — Polish do CZ (Claude Sonnet)
// ────────────────────────────────────────────────────────────────────
const POLISH_SYSTEM = `Jsi hlavní editor Olivator.cz. Tón: chytrý kamarád
sommelier (Wirecutter + Wine Folly styl).

ÚLOHA: Z anglických / italských / řeckých dat o značce vytvoř finální draft
v ČEŠTINĚ pro brand detail stránku.

PRAVIDLA:
- Aktivní hlas, přítomný čas, přirozená čeština
- ŽÁDNÉ marketingové obecnosti („výjimečná chuť", „prémiový zážitek")
- Konkrétní fakta, jména, roky — pokud nejsou ve vstupu, NEVYMÝŠLEJ
- Pokud zdrojová data o něčem mlčí, vrať null pro to pole
- Překládej názvy regionů (Apulia → Apulie, Crete → Kréta)
- Nepřekládej názvy produktů ani jména

VÝSTUP — POUZE validní JSON:
{
  "tldr": "max 280 znaků, 1-2 věty hook pro Trust řádek",
  "descriptionShort": "max 200 znaků, listing karta",
  "descriptionLong": "3-6 odstavců markdown s ## sekcemi (## Příběh / ## Region / ## Filozofie / ## Sortiment apod.). Bez ## se použije jako úvodní lead.",
  "story": "Konkrétní příběh ve 2-3 odstavcích markdown — kdy začalo, kdo, proč. Null pokud na webu není.",
  "philosophy": "Co dělají jinak / čemu věří, 1-2 odstavce markdown. Null pokud chybí.",
  "foundedYear": 1860,
  "headquarters": "Apulie, Itálie",
  "websiteUrl": "https://oliointini.it",
  "timeline": [{"year": 1860, "label": "krátký popisek do 60 znaků"}],
  "metaTitle": "max 70 znaků, ${'<brand>'} — krátký dovětek",
  "metaDescription": "max 160 znaků, vystihuje co značka dělá + co najdeš na Olivator"
}`

// Poslední polish chyba — uloží se sem, aby orchestrátor mohl chybu surfovat
// do UI report.message místo generického "Polish selhal".
let _lastPolishError: string | null = null

async function polishToCzech(args: {
  brandName: string
  candidateUrl: string
  scraped: BrandResearchResult
  productNames: string[]
}): Promise<PolishedDraft | null> {
  _lastPolishError = null
  const userMsg = [
    `Značka: ${args.brandName}`,
    `Web výrobce: ${args.candidateUrl}`,
    ``,
    `Naše produkty této značky (zachovej názvy beze změny):`,
    args.productNames.slice(0, 8).map((n) => `- ${n}`).join('\n') || '- (žádné)',
    ``,
    `Zdrojová data ze scrape:`,
    `descriptionShort: ${args.scraped.descriptionShort ?? '(nic)'}`,
    `descriptionLong: ${args.scraped.descriptionLong ?? '(nic)'}`,
    `story: ${args.scraped.story ?? '(nic)'}`,
    `philosophy: ${args.scraped.philosophy ?? '(nic)'}`,
    `foundedYear: ${args.scraped.foundedYear ?? '(nic)'}`,
    `headquarters: ${args.scraped.headquarters ?? '(nic)'}`,
    `familyOwned: ${args.scraped.familyOwned ?? '(nic)'}`,
    `certifications: ${args.scraped.certifications.join(', ') || '(žádné)'}`,
    ``,
    `Vytvoř polished draft v češtině dle schématu výše.`,
  ].join('\n')

  try {
    const response = await callClaude({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: POLISH_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })
    const raw = extractText(response).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    const match = raw.match(/\{[\s\S]*\}/)
    const jsonStr = match ? match[0] : raw
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>

    const timelineRaw = Array.isArray(parsed.timeline) ? parsed.timeline : []
    const timeline = timelineRaw
      .filter((t): t is { year: number; label: string } => {
        const obj = t as { year?: unknown; label?: unknown }
        return typeof obj.year === 'number' && typeof obj.label === 'string'
      })
      .slice(0, 5)

    return {
      tldr: typeof parsed.tldr === 'string' ? parsed.tldr.trim().slice(0, 280) : null,
      descriptionShort:
        typeof parsed.descriptionShort === 'string' ? parsed.descriptionShort.trim().slice(0, 200) : null,
      descriptionLong: typeof parsed.descriptionLong === 'string' ? parsed.descriptionLong.trim() : null,
      story: typeof parsed.story === 'string' ? parsed.story.trim() : null,
      philosophy: typeof parsed.philosophy === 'string' ? parsed.philosophy.trim() : null,
      foundedYear:
        typeof parsed.foundedYear === 'number' && parsed.foundedYear >= 1500 && parsed.foundedYear <= 2100
          ? parsed.foundedYear
          : null,
      headquarters: typeof parsed.headquarters === 'string' ? parsed.headquarters.trim() : null,
      websiteUrl: typeof parsed.websiteUrl === 'string' ? parsed.websiteUrl.trim() : args.candidateUrl,
      timeline,
      metaTitle: typeof parsed.metaTitle === 'string' ? parsed.metaTitle.trim().slice(0, 70) : null,
      metaDescription:
        typeof parsed.metaDescription === 'string' ? parsed.metaDescription.trim().slice(0, 160) : null,
    }
  } catch (err) {
    const status = (err as { status?: number }).status
    const apiError = (err as { error?: { error?: { message?: string } } }).error?.error?.message
    const msg = err instanceof Error ? err.message : 'unknown'
    _lastPolishError = apiError ? `${msg} (${apiError})` : msg
    if (status) _lastPolishError = `HTTP ${status}: ${_lastPolishError}`
    console.error('[brand-auto-fill] polish failed:', _lastPolishError, err)
    return null
  }
}

// ────────────────────────────────────────────────────────────────────
// Stage 5 — Apply do DB
// ────────────────────────────────────────────────────────────────────
async function applyDraftToBrand(brand: BrandRow, draft: PolishedDraft): Promise<string[]> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const applied: string[] = []

  const fieldMap: Array<[keyof PolishedDraft, string]> = [
    ['tldr', 'tldr'],
    ['descriptionShort', 'description_short'],
    ['descriptionLong', 'description_long'],
    ['story', 'story'],
    ['philosophy', 'philosophy'],
    ['foundedYear', 'founded_year'],
    ['headquarters', 'headquarters'],
    ['websiteUrl', 'website_url'],
    ['metaTitle', 'meta_title'],
    ['metaDescription', 'meta_description'],
  ]
  for (const [src, dst] of fieldMap) {
    const v = draft[src]
    if (v !== null && v !== undefined && v !== '') {
      patch[dst] = v
      applied.push(dst)
    }
  }
  if (draft.timeline.length > 0) {
    patch.timeline = draft.timeline
    applied.push('timeline')
  }

  if (Object.keys(patch).length === 1) return applied // jen updated_at

  const { error } = await supabaseAdmin.from('brands').update(patch).eq('id', brand.id)
  if (error) throw new Error(`Brand update failed: ${error.message}`)
  return applied
}

async function saveLogo(brand: BrandRow, logoUrl: string, sourceUrl: string): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from('entity_images')
    .select('id, status')
    .eq('entity_id', brand.id)
    .eq('url', logoUrl)
    .maybeSingle()
  if (existing) {
    // Pokud byl soft-smazaný, reaktivuj — admin klikl auto-fill, chce logo živé.
    if (existing.status !== 'active') {
      await supabaseAdmin
        .from('entity_images')
        .update({ status: 'active', image_role: 'logo', is_primary: true })
        .eq('id', existing.id)
      return true
    }
    return false
  }

  await supabaseAdmin.from('entity_images').insert({
    entity_type: 'brand',
    entity_id: brand.id,
    url: logoUrl,
    alt_text: `${brand.name} logo`,
    source: 'auto_research',
    source_attribution: `Auto-fetched from ${sourceUrl}`,
    is_primary: true,
    sort_order: 0,
    status: 'active',
    image_role: 'logo',
  })
  return true
}

async function saveGallery(brand: BrandRow, urls: string[], sourceUrl: string): Promise<number> {
  if (urls.length === 0) return 0
  // Dedup + reaktivace soft-smazaných auto_research fotek
  const { data: existing } = await supabaseAdmin
    .from('entity_images')
    .select('id, url, status, source')
    .eq('entity_id', brand.id)
  const existingByUrl = new Map<string, { id: string; status: string; source: string | null }>()
  for (const r of existing ?? []) {
    existingByUrl.set((r.url as string).split('?')[0], {
      id: r.id as string,
      status: r.status as string,
      source: r.source as string | null,
    })
  }

  let touched = 0
  const newRows: Array<Record<string, unknown>> = []
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const base = url.split('?')[0]
    const existingRow = existingByUrl.get(base)
    if (existingRow) {
      // Reaktivuj jen auto_research fotky — nezasahuj do unsplash/manual uploads
      if (existingRow.status !== 'active' && existingRow.source === 'auto_research') {
        await supabaseAdmin
          .from('entity_images')
          .update({ status: 'active', image_role: 'gallery' })
          .eq('id', existingRow.id)
        touched++
      }
      continue
    }
    newRows.push({
      entity_type: 'brand',
      entity_id: brand.id,
      url,
      alt_text: `${brand.name} — fotka ${i + 1}`,
      source: 'auto_research',
      source_attribution: `Auto-fetched from ${sourceUrl}`,
      is_primary: false,
      sort_order: i + 10,
      status: 'active',
      image_role: 'gallery',
    })
  }

  if (newRows.length > 0) {
    const { error } = await supabaseAdmin.from('entity_images').insert(newRows)
    if (error) {
      console.warn('[brand-auto-fill] saveGallery insert failed:', error.message)
      return touched
    }
  }
  return touched + newRows.length
}

// ────────────────────────────────────────────────────────────────────
// Persistence pro pending review
// ────────────────────────────────────────────────────────────────────
async function saveDraft(args: {
  brandId: string
  status: AutoFillStatus
  candidate: ProducerUrlCandidate | null
  verification: VerifyResult | null
  polished: PolishedDraft | null
  message: string
}) {
  const { error } = await supabaseAdmin.from('brand_research_drafts').upsert(
    {
      brand_id: args.brandId,
      candidate_url: args.candidate?.url ?? null,
      url_confidence: args.candidate?.confidence ?? null,
      url_source: args.candidate?.source ?? null,
      verify_confidence: args.verification?.confidence ?? null,
      verify_reason: args.verification?.reason ?? null,
      status: args.status,
      draft: args.polished ?? null,
      message: args.message,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'brand_id' }
  )
  // Tolerantní k chybějící migraci — orchestrátor pokračuje, jen log warning.
  if (error) console.warn('[brand-auto-fill] saveDraft failed:', error.message)
}

// ────────────────────────────────────────────────────────────────────
// Main orchestrator
// ────────────────────────────────────────────────────────────────────
export async function autoFillBrand(slug: string): Promise<AutoFillReport> {
  const empty: AutoFillReport = {
    brandSlug: slug,
    status: 'error',
    candidate: null,
    scrapedRaw: null,
    verification: null,
    polished: null,
    appliedFields: [],
    logoSaved: false,
    galleryAdded: 0,
    message: '',
  }

  // Load brand + linked products
  const { data: brand, error: brandErr } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, country_code')
    .eq('slug', slug)
    .maybeSingle()
  if (brandErr) return { ...empty, message: `DB error: ${brandErr.message}` }
  if (!brand) return { ...empty, message: 'Brand not found' }

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, origin_region')
    .eq('brand_slug', slug)
    .limit(10)

  const productNames = (products ?? []).map((p) => p.name as string).filter(Boolean)
  const productRegions = (products ?? [])
    .map((p) => p.origin_region as string | null)
    .filter((r): r is string => !!r)

  // Stage 1 — find URL
  const candidate = await findProducerUrl({
    brandName: brand.name,
    countryCode: brand.country_code,
    regionHint: productRegions[0] ?? null,
    productNames,
  })

  if (!candidate) {
    const report: AutoFillReport = {
      ...empty,
      status: 'no_url',
      message: 'Web výrobce nebyl nalezen — zadej URL ručně.',
    }
    await saveDraft({
      brandId: brand.id,
      status: report.status,
      candidate: null,
      verification: null,
      polished: null,
      message: report.message,
    })
    return report
  }

  // Stage 2 — research
  let scraped: BrandResearchResult
  try {
    scraped = await researchBrand(candidate.url)
  } catch (err) {
    const report: AutoFillReport = {
      ...empty,
      status: 'error',
      candidate,
      message: `Scrape selhal: ${err instanceof Error ? err.message : 'unknown'}`,
    }
    await saveDraft({
      brandId: brand.id,
      status: report.status,
      candidate,
      verification: null,
      polished: null,
      message: report.message,
    })
    return report
  }

  // Stage 3 — verify
  const verification = await verifyBrand({
    brand,
    candidateUrl: candidate.url,
    scraped,
    productNames,
    productRegions,
  })

  if (!verification.verified || verification.confidence < 60) {
    const report: AutoFillReport = {
      ...empty,
      status: 'rejected',
      candidate,
      scrapedRaw: scraped,
      verification,
      message: `Cross-check selhal (confidence ${verification.confidence}): ${verification.reason}`,
    }
    await saveDraft({
      brandId: brand.id,
      status: report.status,
      candidate,
      verification,
      polished: null,
      message: report.message,
    })
    return report
  }

  // Stage 4 — polish to CZ
  const polished = await polishToCzech({
    brandName: brand.name,
    candidateUrl: candidate.url,
    scraped,
    productNames,
  })

  if (!polished) {
    const report: AutoFillReport = {
      ...empty,
      status: 'error',
      candidate,
      scrapedRaw: scraped,
      verification,
      message: `Polish selhal (Claude Sonnet): ${_lastPolishError ?? 'unknown'}`,
    }
    await saveDraft({
      brandId: brand.id,
      status: report.status,
      candidate,
      verification,
      polished: null,
      message: report.message,
    })
    return report
  }

  // Stage 5 — apply (jen pokud confidence ≥ threshold)
  const overallConfidence = Math.min(candidate.confidence, verification.confidence)
  let appliedFields: string[] = []
  let logoSaved = false
  let galleryAdded = 0
  let status: AutoFillStatus

  if (overallConfidence >= MIN_APPLY_CONFIDENCE) {
    appliedFields = await applyDraftToBrand(brand, polished)
    if (scraped.logoUrl) {
      logoSaved = await saveLogo(brand, scraped.logoUrl, candidate.url)
    }
    galleryAdded = await saveGallery(brand, scraped.galleryUrls, candidate.url)
    status = 'applied'
  } else {
    status = 'pending_review'
  }

  const report: AutoFillReport = {
    brandSlug: slug,
    status,
    candidate,
    scrapedRaw: scraped,
    verification,
    polished,
    appliedFields,
    logoSaved,
    galleryAdded,
    message:
      status === 'applied'
        ? `Aplikováno (confidence ${overallConfidence}). ${appliedFields.length} polí, logo ${logoSaved ? 'uloženo' : 'už existovalo'}, ${galleryAdded} fotek do galerie.`
        : `Návrh připraven k revizi (confidence ${overallConfidence} < ${MIN_APPLY_CONFIDENCE}).`,
  }

  await saveDraft({
    brandId: brand.id,
    status: report.status,
    candidate,
    verification,
    polished,
    message: report.message,
  })

  return report
}
