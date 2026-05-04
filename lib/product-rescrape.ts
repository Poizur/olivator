// Full-pipeline rescrape pro produkty — scrape → fakta → flavor → AI rewrite
// → Score → galerie → auto lab scan. Voláno z:
//   - POST /api/admin/products/[id]/rescrape (admin manuální klik)
//   - lib/feed-sync.ts (auto trigger pro nové drafty z XML feedu)
//   - POST /api/admin/products/bulk-rescrape (admin batch akce)
//
// Cíl: po vytvoření draftu (z feedu nebo manuálně) má admin kompletní data
// hned — Score, popisy, fotky, lab report values. Stačí zkontrolovat a publikovat.

import { supabaseAdmin } from './supabase'
import { scrapeProductPage } from './product-scraper'
import { applyRescrapePatch, updateProductFacts } from './data'
import { extractFactsFromText } from './fact-extractor'
import { estimateFlavorProfile } from './flavor-agent'
import { generateProductDescriptions } from './content-agent'
import { calculateScore } from './score'
import { deriveUseCases } from './use-case-deriver'
import { countryName } from './utils'
import { revalidateProduct } from './revalidate'
import { auditProduct } from './quality-rules'
import { scanLabReport, looksLikeLabReport, type LabReportData } from './lab-report-agent'

export interface RescrapeResult {
  ok: boolean
  steps: string[]
  failures: string[]
  filled: string[]
  factsCount: number
  flavorReasoning: string | null
  scoreTotal: number | null
  scoreBreakdown: Record<string, number> | null
  descriptionsGenerated: boolean
  validationWarnings: number
  galleryCount: number
  labScansRun: number       // kolik lab reportů scanoval
  labScansFilled: number    // kolik přineslo nová data
  rawDescriptionLength: number
}

interface RunRescrapeOptions {
  url?: string  // override source_url
}

export async function runRescrape(
  productId: string,
  opts: RunRescrapeOptions = {}
): Promise<RescrapeResult> {
  const steps: string[] = []
  const failures: string[] = []
  const filled: string[] = []
  let factsCount = 0
  let flavorReasoning: string | null = null
  let scoreTotal: number | null = null
  let scoreBreakdown: Record<string, number> | null = null
  let descriptionsGenerated = false
  let validationWarnings = 0
  let galleryCount = 0
  let labScansRun = 0
  let labScansFilled = 0
  let rawDescriptionLength = 0

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('source_url')
    .eq('id', productId)
    .maybeSingle()
  if (error) throw error
  if (!product) throw new Error(`Product ${productId} not found`)

  const url = opts.url?.trim() || (product.source_url as string | null)
  if (!url) throw new Error('Produkt nemá source_url')

  // ── 1. Scrape ───────────────────────────────────────────────────────────
  const scraped = await scrapeProductPage(url)
  rawDescriptionLength = scraped.rawDescription?.length ?? 0
  steps.push(`scrape (${rawDescriptionLength} znaků)`)

  // ── 2. Patch NULL fields + uloží lab values + parameter table ──────────
  const patchResult = await applyRescrapePatch(productId, {
    sourceUrl: url,
    rawDescription: scraped.rawDescription,
    ean: scraped.ean,
    acidity: scraped.acidity,
    polyphenols: scraped.polyphenols,
    peroxideValue: scraped.peroxideValue,
    oleicAcidPct: scraped.oleicAcidPct,
    volumeMl: scraped.volumeMl,
    packaging: scraped.packaging,
    k232: scraped.k232,
    k270: scraped.k270,
    deltaK: scraped.deltaK,
    waxMaxMgPerKg: scraped.waxMaxMgPerKg,
    parameterTable: scraped.parameterTable,
  })
  filled.push(...patchResult.filled)
  if (patchResult.filled.length > 0) steps.push(`doplněno: ${patchResult.filled.join(', ')}`)

  // ── 3. Save gallery URLs as candidates ──────────────────────────────────
  if (scraped.galleryImages.length > 0) {
    galleryCount = scraped.galleryImages.length
    await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('product_id', productId)
      .eq('source', 'scraper_candidate')

    const { data: existingRows } = await supabaseAdmin
      .from('product_images')
      .select('url')
      .eq('product_id', productId)
    const existingUrls = new Set((existingRows ?? []).map(r => r.url as string))
    const newCandidates = scraped.galleryImages.filter(img => !existingUrls.has(img.url))

    if (newCandidates.length > 0) {
      const rows = newCandidates.map((img, i) => ({
        product_id: productId,
        url: img.url,
        alt_text: img.alt,
        is_primary: false,
        sort_order: 100 + i,
        source: 'scraper_candidate',
      }))
      const { error: imgErr } = await supabaseAdmin.from('product_images').insert(rows)
      if (imgErr) failures.push(`galerie: ${imgErr.message}`)
      else steps.push(`galerie +${rows.length} kandidátů`)
    }
  }

  // ── 4. Facts (Haiku) ────────────────────────────────────────────────────
  if (scraped.rawDescription && scraped.rawDescription.length > 30) {
    try {
      const facts = await extractFactsFromText(scraped.rawDescription)
      await updateProductFacts(productId, facts)
      factsCount = facts.length
      steps.push(`${facts.length} faktů`)
    } catch (err) {
      failures.push(`fakta: ${err instanceof Error ? err.message : 'chyba'}`)
    }
  }

  // ── 5. Flavor profile (Haiku) ──────────────────────────────────────────
  if (scraped.rawDescription && scraped.rawDescription.length > 30) {
    try {
      const flavor = await estimateFlavorProfile({
        name: scraped.name ?? '',
        rawDescription: scraped.rawDescription,
        acidity: scraped.acidity,
        polyphenols: scraped.polyphenols,
        originCountry: scraped.originCountry,
        originRegion: scraped.originRegion,
        type: scraped.type,
      })
      const { fruity, herbal, bitter, spicy, mild, nutty, buttery } = flavor
      await supabaseAdmin
        .from('products')
        .update({ flavor_profile: { fruity, herbal, bitter, spicy, mild, nutty, buttery } })
        .eq('id', productId)
      flavorReasoning = flavor.reasoning
      steps.push('chuťový profil')
    } catch (err) {
      failures.push(`chuť: ${err instanceof Error ? err.message : 'chyba'}`)
    }
  }

  // ── 5b. AUTO LAB SCAN ───────────────────────────────────────────────────
  // Pro každou nově přidanou fotku, která vypadá jako lab report (heuristika
  // přes URL / alt — viz looksLikeLabReport), spustíme Sonnet vision scan.
  // Doplníme pouze NULL pole (existing values nepřepisujeme — admin override
  // nebo XML feed má prioritu). Lab report s reálnými hodnotami → fresh
  // polyphenols / oleocanthal / peroxide / K232 / K270 v draftu hned.
  try {
    const { data: candidates } = await supabaseAdmin
      .from('product_images')
      .select('id, url, alt_text')
      .eq('product_id', productId)
      .eq('source', 'scraper_candidate')

    const labLikely = (candidates ?? []).filter((c) =>
      looksLikeLabReport(c.url as string, (c.alt_text as string | null) ?? null)
    )

    for (const cand of labLikely) {
      try {
        const lab: LabReportData = await scanLabReport(cand.url as string)
        labScansRun++
        // Doplníme jen pole která jsou v products NULL
        const { data: current } = await supabaseAdmin
          .from('products')
          .select('acidity, polyphenols, oleocanthal, peroxide_value, oleic_acid_pct, k232, k270, delta_k')
          .eq('id', productId)
          .maybeSingle()

        const labPatch: Record<string, unknown> = {}
        if (current?.acidity == null && lab.acidity != null) labPatch.acidity = lab.acidity
        if (current?.polyphenols == null && lab.polyphenols != null) labPatch.polyphenols = lab.polyphenols
        if (current?.oleocanthal == null && lab.oleocanthal != null) labPatch.oleocanthal = lab.oleocanthal
        if (current?.peroxide_value == null && lab.peroxideValue != null) labPatch.peroxide_value = lab.peroxideValue
        if (current?.oleic_acid_pct == null && lab.oleicAcidPct != null) labPatch.oleic_acid_pct = lab.oleicAcidPct
        if (current?.k232 == null && lab.k232 != null) labPatch.k232 = lab.k232
        if (current?.k270 == null && lab.k270 != null) labPatch.k270 = lab.k270
        if (current?.delta_k == null && lab.deltaK != null) labPatch.delta_k = lab.deltaK

        if (Object.keys(labPatch).length > 0) {
          await supabaseAdmin.from('products').update(labPatch).eq('id', productId)
          labScansFilled++
          steps.push(`lab scan (${Object.keys(labPatch).length} polí: ${Object.keys(labPatch).join(', ')})`)
        }
      } catch (err) {
        failures.push(`lab scan: ${err instanceof Error ? err.message : 'chyba'}`)
      }
    }
    if (labLikely.length === 0) {
      // No lab report detected — that's fine, normal product photos
    } else if (labScansFilled === 0 && labScansRun > 0) {
      steps.push(`lab scan: ${labScansRun}× přečteno (bez nových dat — vše už vyplněno)`)
    }
  } catch (err) {
    console.warn('[rescrape] lab scan stage failed:', err)
  }

  // ── 6. Score recalculation ──────────────────────────────────────────────
  const { data: freshProduct } = await supabaseAdmin
    .from('products')
    .select('acidity, polyphenols, peroxide_value, certifications, volume_ml')
    .eq('id', productId)
    .maybeSingle()
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('price')
    .eq('product_id', productId)
    .order('price', { ascending: true })
    .limit(1)
  const cheapestPrice = offers?.[0]?.price ? Number(offers[0].price) : null
  const volumeMl = freshProduct?.volume_ml ? Number(freshProduct.volume_ml) : null
  const pricePer100ml = cheapestPrice && volumeMl ? (cheapestPrice / volumeMl) * 100 : null

  const score = calculateScore({
    acidity: freshProduct?.acidity != null ? Number(freshProduct.acidity) : null,
    polyphenols: freshProduct?.polyphenols ?? null,
    peroxideValue: freshProduct?.peroxide_value != null ? Number(freshProduct.peroxide_value) : null,
    certifications: (freshProduct?.certifications as string[]) ?? [],
    pricePer100ml,
  })
  await supabaseAdmin
    .from('products')
    .update({ olivator_score: score.total, score_breakdown: score.breakdown })
    .eq('id', productId)
  scoreTotal = score.total
  scoreBreakdown = score.breakdown
  steps.push(`Score ${score.total}/100`)

  // ── 6b. Use cases (rule-based) ──────────────────────────────────────────
  const { data: flavorRow } = await supabaseAdmin
    .from('products')
    .select('flavor_profile')
    .eq('id', productId)
    .maybeSingle()
  const pricePerLiter = cheapestPrice && volumeMl ? (cheapestPrice / volumeMl) * 1000 : null
  const derived = deriveUseCases({
    type: scraped.type,
    acidity: freshProduct?.acidity != null ? Number(freshProduct.acidity) : null,
    polyphenols: freshProduct?.polyphenols ?? null,
    flavorProfile: (flavorRow?.flavor_profile as Record<string, number>) ?? null,
    pricePerLiter,
    packaging: scraped.packaging,
    certifications: (freshProduct?.certifications as string[]) ?? [],
  })
  await supabaseAdmin.from('products').update({ use_cases: derived.useCases }).eq('id', productId)
  steps.push(`použití: ${derived.useCases.join(', ')}`)

  // ── 7. AI rewrite (Sonnet) ──────────────────────────────────────────────
  if (scraped.rawDescription && scraped.rawDescription.length > 100) {
    try {
      const { data: factsRow } = await supabaseAdmin
        .from('products')
        .select('extracted_facts')
        .eq('id', productId)
        .maybeSingle()
      const extractedFacts = Array.isArray(factsRow?.extracted_facts)
        ? (factsRow.extracted_facts as Array<{ key: string; label: string; value: string; importance: string; source: string }>)
        : []

      const highFactsContext = extractedFacts.length > 0
        ? [
            'POVINNÁ FAKTA (MUSÍŠ zmínit v longDescription — každé z nich):',
            ...extractedFacts.filter(f => f.importance === 'high').map(f => `  • ${f.label}: ${f.value}`),
          ].join('\n')
        : null

      const generated = await generateProductDescriptions({
        name: scraped.name ?? '',
        brand: null,
        origin: scraped.originCountry ? countryName(scraped.originCountry) : null,
        region: scraped.originRegion,
        type: scraped.type,
        volumeMl: scraped.volumeMl,
        acidity: scraped.acidity,
        polyphenols: scraped.polyphenols,
        certifications: (freshProduct?.certifications as string[]) ?? [],
        olivatorScore: score.total,
        rawDescription: scraped.rawDescription,
        factsPromptContext: highFactsContext,
      })

      await supabaseAdmin
        .from('products')
        .update({
          description_short: generated.shortDescription,
          description_long: generated.longDescription,
          ai_generated_at: new Date().toISOString(),
        })
        .eq('id', productId)
      descriptionsGenerated = true
      const full = `${generated.shortDescription} ${generated.longDescription}`.toLowerCase()
      const bannedHints = ['šetrné zpracov', 'prémiov', 'výjimečn', 'místních odrůd', 'lehčí středomořsk']
      validationWarnings = bannedHints.filter(b => full.includes(b)).length
      steps.push(
        validationWarnings === 0 ? 'AI popisy (čisté)' : `AI popisy (${validationWarnings} vata-fráze)`
      )
    } catch (err) {
      failures.push(`AI popisy: ${err instanceof Error ? err.message : 'chyba'}`)
    }
  }

  await supabaseAdmin
    .from('products')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', productId)

  try {
    await auditProduct(productId, { persist: true })
  } catch (err) {
    console.warn('[rescrape] quality audit failed:', err)
  }

  await revalidateProduct(productId)

  return {
    ok: true,
    steps,
    failures,
    filled,
    factsCount,
    flavorReasoning,
    scoreTotal,
    scoreBreakdown,
    descriptionsGenerated,
    validationWarnings,
    galleryCount,
    labScansRun,
    labScansFilled,
    rawDescriptionLength,
  }
}
