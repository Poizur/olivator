// Discovery Agent — finds new olive oils across configured shops, dedupes
// against our DB, auto-publishes high-confidence finds, queues the rest
// for admin review.
//
// Pipeline:
//   1. Crawl enabled shops (lib/shop-crawlers) → list of product URLs
//   2. For each URL → scrape product (lib/product-scraper)
//   3. Match against existing products by EAN / fuzzy name
//   4. Decide:
//      - EAN match exact → AUTO_ADDED_OFFER (just add new offer for this retailer)
//      - Strong fuzzy name match → NEEDS_REVIEW (probably duplicate)
//      - Truly new + high confidence (good data) → AUTO_PUBLISHED (or PENDING if auto-publish off)
//      - New but low confidence → NEEDS_REVIEW
//   5. Persist decisions to discovery_candidates table
//   6. Generate AI content for new products that should be published

import { supabaseAdmin } from './supabase'
import { scrapeProductPage, type ScrapedProduct } from './product-scraper'
import { crawlShops, getKnownShopSlugs } from './shop-crawlers'
import { getRetailerSlugsWithXmlFeed } from './feed-sync-runner'
import { getSetting } from './settings'
import { generateProductDescriptions, generateMetaDescription } from './content-agent'
import { calculateScore } from './score'
import { extractFactsFromText } from './fact-extractor'
import { estimateFlavorProfile } from './flavor-agent'
import { deriveUseCases } from './use-case-deriver'
import { downloadAndStoreImage, generateImageAltText } from './product-image'
import { scanLabReport, looksLikeLabReport } from './lab-report-agent'
import { detectCertificationsInText } from './cert-detector'
import { auditProduct, runPrePublishAudit } from './quality-rules'
import { countryName } from './utils'

export type CandidateStatus =
  | 'pending'
  | 'auto_published'
  | 'auto_added_offer'
  | 'approved'
  | 'rejected'
  | 'needs_review'
  | 'failed'

export interface DiscoveryRunResult {
  shopsCrawled: number
  totalUrlsFound: number
  newCandidates: number
  autoPublished: number
  autoAddedOffers: number
  needsReview: number
  failed: number
  errors: string[]
  shopErrors: Array<{ shop: string; error: string }>
  candidateIds: string[]
}

/** Normalize a product name for fuzzy matching: lowercase, strip diacritics,
 *  collapse whitespace, remove volume markers. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/\d+[.,]?\d*\s*(?:ml|l|kg|g)\b/gi, '') // strip volume
    .replace(/\bextra\s*panensk[yý]\b/gi, '') // strip "extra panensky" — too generic
    .replace(/\bolivov\w*\s*olej\w*\b/gi, '') // strip "olivovy olej"
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein distance (DP) — for fuzzy name matching. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

/** Match scraped product against existing DB products.
 *  Returns: { matched_product_id?, match_type, match_confidence, reasoning }. */
async function matchProduct(scraped: ScrapedProduct): Promise<{
  matchedProductId: string | null
  matchType: 'ean' | 'fuzzy_name' | 'none'
  matchConfidence: number
  reasoning: string
}> {
  // 1. EAN exact match (strongest signal)
  if (scraped.ean) {
    const { data: byEan } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('ean', scraped.ean)
      .maybeSingle()
    if (byEan?.id) {
      return {
        matchedProductId: byEan.id as string,
        matchType: 'ean',
        matchConfidence: 1.0,
        reasoning: `EAN ${scraped.ean} přesná shoda s existujícím produktem "${byEan.name}"`,
      }
    }
  }

  // 2. Fuzzy name match — get all products, compute similarity
  if (!scraped.name) {
    return { matchedProductId: null, matchType: 'none', matchConfidence: 0, reasoning: 'Bez názvu' }
  }
  const { data: all } = await supabaseAdmin
    .from('products')
    .select('id, name, volume_ml')
  const candidates = all ?? []
  const normalizedScraped = normalizeName(scraped.name)
  if (!normalizedScraped) {
    return { matchedProductId: null, matchType: 'none', matchConfidence: 0, reasoning: 'Název po normalizaci prázdný' }
  }

  let best: { id: string; name: string; similarity: number } | null = null
  for (const p of candidates) {
    const normalizedDb = normalizeName(p.name as string)
    if (!normalizedDb) continue
    const dist = levenshtein(normalizedScraped, normalizedDb)
    const maxLen = Math.max(normalizedScraped.length, normalizedDb.length)
    const similarity = 1 - dist / maxLen
    // Bonus for same volume
    let bonus = 0
    if (scraped.volumeMl && p.volume_ml && Number(scraped.volumeMl) === Number(p.volume_ml)) bonus = 0.1
    const adjusted = Math.min(1, similarity + bonus)
    if (!best || adjusted > best.similarity) {
      best = { id: p.id as string, name: p.name as string, similarity: adjusted }
    }
  }

  if (best && best.similarity >= 0.85) {
    return {
      matchedProductId: best.id,
      matchType: 'fuzzy_name',
      matchConfidence: best.similarity,
      reasoning: `Pravděpodobně stejný produkt jako "${best.name}" (podobnost ${(best.similarity * 100).toFixed(0)}%)`,
    }
  }
  if (best && best.similarity >= 0.70) {
    return {
      matchedProductId: best.id,
      matchType: 'fuzzy_name',
      matchConfidence: best.similarity,
      reasoning: `Možný duplikát s "${best.name}" (${(best.similarity * 100).toFixed(0)}%) — vyžaduje schválení`,
    }
  }

  return {
    matchedProductId: null,
    matchType: 'none',
    matchConfidence: best?.similarity ?? 0,
    reasoning: best
      ? `Žádná shoda. Nejbližší: "${best.name}" (${(best.similarity * 100).toFixed(0)}%) — pod prahem 70%`
      : 'Žádný podobný produkt v DB',
  }
}

/** Heuristic: how confident are we this is a publishable product?
 *  high → enough data, can auto-publish
 *  medium → has basics but missing 1-2 things, defer to admin
 *  low → too sparse, definitely review */
function assessQuality(scraped: ScrapedProduct): {
  quality: 'high' | 'medium' | 'low'
  reasoning: string
} {
  const hasName = !!scraped.name
  const hasOrigin = !!scraped.originCountry
  const hasVolume = !!scraped.volumeMl
  const hasPrice = !!scraped.price
  const hasImage = !!scraped.imageUrl
  const hasRawDesc = !!(scraped.rawDescription && scraped.rawDescription.length > 200)
  const hasAcidity = scraped.acidity != null
  const hasType = !!scraped.type

  const score = [hasName, hasOrigin, hasVolume, hasPrice, hasImage, hasRawDesc, hasAcidity, hasType]
    .filter(Boolean).length

  if (score >= 7) {
    return { quality: 'high', reasoning: `Skoro úplná data (${score}/8 polí)` }
  }
  if (score >= 5) {
    return { quality: 'medium', reasoning: `Slušná data, ale chybí ${8 - score} pole` }
  }
  return { quality: 'low', reasoning: `Sparse data (${score}/8) — chybí název / původ / cena / obrázek` }
}

/** Resolve a candidate's source_domain to retailer slug + canonical domain.
 *  Strips `www.` prefix so lookup works regardless of whether the candidate
 *  was scraped from a www-prefixed URL or not.
 *
 *  Auto-creates the retailer row if it doesn't exist yet — discovery_sources
 *  table is separate from retailers table, so a shop added via Prospector
 *  has no retailer entry until first product is published from it. Without
 *  this on-the-fly upsert, bulk-approve crashes with "Retailer X not found". */
export async function resolveRetailerForCandidate(
  sourceDomain: string
): Promise<{ slug: string; domain: string }> {
  const normalized = sourceDomain.replace(/^www\./, '')

  // 1) Lookup by domain
  const { data: byDomain } = await supabaseAdmin
    .from('retailers')
    .select('slug')
    .eq('domain', normalized)
    .maybeSingle()
  if (byDomain?.slug) {
    return { slug: byDomain.slug as string, domain: normalized }
  }

  // 2) Derive slug from domain root (e.g. "reckyeshop.cz" → "reckyeshop")
  const slug = normalized.split('.')[0]

  // 3) Lookup by slug (in case retailer exists with different domain spelling)
  const { data: bySlug } = await supabaseAdmin
    .from('retailers')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (bySlug?.slug) {
    return { slug: bySlug.slug as string, domain: normalized }
  }

  // 4) Auto-create — Title Case the slug for display name
  const name = slug.charAt(0).toUpperCase() + slug.slice(1)
  await supabaseAdmin.from('retailers').upsert(
    {
      slug,
      name,
      domain: normalized,
      is_active: true,
      market: 'CZ',
    },
    { onConflict: 'slug' }
  )

  return { slug, domain: normalized }
}

/** Convert ScrapedProduct → product DB row + create offer + run AI pipeline.
 *  Returns the new product id. Exported so admin "approve" endpoint can run
 *  the same pipeline when admin manually approves a needs_review candidate. */
export async function publishCandidate(
  scraped: ScrapedProduct,
  retailerSlug: string,
  retailerDomain: string
): Promise<string> {
  if (!scraped.name || !scraped.slug) throw new Error('Missing name/slug')

  // Auto-detect certifications from raw + name (HIGH-confidence only — admin
  // can review LOW/MEDIUM later in cert detector panel).
  const detectedCerts: string[] = []
  const certText = [scraped.name, scraped.rawDescription].filter(Boolean).join('\n')
  if (certText) {
    const candidates = detectCertificationsInText(certText)
    for (const c of candidates) {
      if (c.confidence === 'high' && !detectedCerts.includes(c.cert)) {
        detectedCerts.push(c.cert)
      }
    }
  }

  // Ensure retailer
  const { data: retailer } = await supabaseAdmin
    .from('retailers')
    .select('id')
    .eq('slug', retailerSlug)
    .maybeSingle()
  if (!retailer) throw new Error(`Retailer ${retailerSlug} not found`)

  // Create product (status='draft' initially).
  // CLAUDE.md BUG-008: EAN je master klíč — pokud máme EAN, upsert na EAN
  // (zabrání duplicitě když dva e-shopy normalizují název odlišně do jiného
  // slugu). Bez EAN fallback na slug.
  const productPayload = {
    ean: scraped.ean || null,
    name: scraped.name,
    slug: scraped.slug,
    name_short: scraped.brand,
    origin_country: scraped.originCountry,
    origin_region: scraped.originRegion,
    type: scraped.type ?? 'evoo',
    acidity: scraped.acidity,
    peroxide_value: scraped.peroxideValue,
    volume_ml: scraped.volumeMl,
    packaging: scraped.packaging,
    certifications: detectedCerts,
    description_short: scraped.descriptionShort,
    source_url: scraped.url,
    raw_description: scraped.rawDescription,
    status: 'draft',
  }

  let productId: string

  if (scraped.ean) {
    // 1) EAN je master — pokud existuje, vrátíme jeho ID místo INSERT.
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('ean', scraped.ean)
      .maybeSingle()

    if (existing) {
      // Update existující řádek (může mít jiný slug z dřívějšího scrape).
      // Slug NEPŘEPISUJEME — jiné odkazy + admin URL by se rozbily.
      const { name_short, ...updatable } = productPayload
      void name_short
      const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update({ ...updatable, slug: undefined })
        .eq('id', existing.id)
      if (updateErr) throw new Error(`Product update failed: ${updateErr.message}`)
      productId = existing.id as string
    } else {
      // Nový produkt s EAN — insert
      const { data: created, error: prodErr } = await supabaseAdmin
        .from('products')
        .insert(productPayload)
        .select('id')
        .single()
      if (prodErr || !created) throw new Error(`Product insert failed: ${prodErr?.message}`)
      productId = created.id as string
    }
  } else {
    // Bez EAN — fallback na slug-based upsert (farm-direct produkty
    // často nemají EAN, ale ze stejného shopu se opakuje stejný slug)
    const { data: created, error: prodErr } = await supabaseAdmin
      .from('products')
      .upsert(productPayload, { onConflict: 'slug' })
      .select('id')
      .single()
    if (prodErr || !created) throw new Error(`Product upsert failed: ${prodErr?.message}`)
    productId = created.id as string
  }

  // Create / update offer + zaznamenat do price_history (každý run = 1 záznam)
  if (scraped.price) {
    await supabaseAdmin.from('product_offers').upsert(
      {
        product_id: productId,
        retailer_id: retailer.id,
        price: scraped.price,
        currency: scraped.currency ?? 'CZK',
        in_stock: scraped.inStock ?? true,
        product_url: scraped.url,
      },
      { onConflict: 'product_id,retailer_id' }
    )
    // Historický záznam — jeden řádek per run, grafy vývoje ceny
    await supabaseAdmin.from('price_history').insert({
      product_id: productId,
      retailer_id: retailer.id,
      price: scraped.price,
      in_stock: scraped.inStock ?? true,
    })
  }

  // Images — auto-publish first 5 as `scraper` (visible in public gallery,
  // hostováno u nás na Supabase Storage pro SEO/rychlost), zbytek jako
  // `scraper_candidate` (hotlink → šetří storage, admin vybere které swapnout).
  const PUBLISH_COUNT = 5
  if (scraped.galleryImages.length > 0) {
    try {
      const { data: existingRows } = await supabaseAdmin
        .from('product_images')
        .select('url, is_primary')
        .eq('product_id', productId)
      const existingUrls = new Set((existingRows ?? []).map((r) => r.url as string))
      const hasExistingApproved =
        (existingRows ?? []).some((r) => (r.is_primary as boolean | null) === true)

      const newImages = scraped.galleryImages.filter((img) => !existingUrls.has(img.url))
      const toPublish = newImages.slice(0, PUBLISH_COUNT)
      const toCandidate = newImages.slice(PUBLISH_COUNT)

      // Build SEO alt text — uses product name + position. Real description
      // would require Claude vision per photo; this is the safe default.
      const productName = scraped.name ?? 'Olivový olej'
      const productSlug = scraped.slug ?? 'product'
      const altFor = (i: number): string => {
        if (i === 0) return productName
        return `${productName} — pohled ${i + 1}`
      }

      // 1. Insert all rows first with original (e-shop) URLs as fallback
      const rows: Array<{
        product_id: string
        url: string
        alt_text: string
        is_primary: boolean
        sort_order: number
        source: string
      }> = []
      toPublish.forEach((img, i) => {
        rows.push({
          product_id: productId,
          url: img.url,
          alt_text: img.alt && img.alt.length > 5 ? img.alt : altFor(i),
          is_primary: !hasExistingApproved && i === 0,
          sort_order: i,
          source: 'scraper',
        })
      })
      toCandidate.forEach((img, i) => {
        rows.push({
          product_id: productId,
          url: img.url,
          alt_text: img.alt && img.alt.length > 5 ? img.alt : altFor(PUBLISH_COUNT + i),
          is_primary: false,
          sort_order: 100 + i,
          source: 'scraper_candidate',
        })
      })
      let insertedRows: Array<{ id: string; url: string; sort_order: number; source: string }> = []
      if (rows.length > 0) {
        const { data } = await supabaseAdmin
          .from('product_images')
          .insert(rows)
          .select('id, url, sort_order, source')
        insertedRows = (data ?? []) as typeof insertedRows
      }

      // 2. Download all PUBLISHED rows to Supabase Storage in parallel,
      //    update each row with the new hosted URL + AI vision alt text.
      //    Candidates stay as hotlinks (no AI cost on drafts).
      //    Best-effort — if a download fails, row keeps its hotlink.
      const publishedRows = insertedRows.filter((r) => r.source === 'scraper')
      if (publishedRows.length > 0) {
        await Promise.all(
          publishedRows.map(async (r) => {
            try {
              const stored = await downloadAndStoreImage(
                r.url as string,
                productSlug,
                `g${r.sort_order}`
              )
              // Generate vision-based alt text on the original (pre-resize) URL
              // for better detail recognition. Best-effort.
              let altText: string
              try {
                altText = await generateImageAltText(r.url as string, productName)
              } catch {
                altText = productName
              }
              await supabaseAdmin
                .from('product_images')
                .update({ url: stored, alt_text: altText })
                .eq('id', r.id)
            } catch (err) {
              console.warn(`[discovery] gallery download failed for sort=${r.sort_order}:`, err instanceof Error ? err.message : err)
            }
          })
        )
      }

      // 4. Auto-scan ALL product photos for chemistry data.
      //    Etikety a lahve bývají zdrojem dat (kyselost, polyfenoly, oleokantal…)
      //    stejně jako laboratorní protokoly. Zkusíme každou fotku dokud nedostaneme
      //    confidence != 'low'. Jen pokud má produkt aspoň jedno NULL chemické pole.
      try {
        const { data: prod } = await supabaseAdmin
          .from('products')
          .select('acidity, polyphenols, oleocanthal, peroxide_value, oleic_acid_pct')
          .eq('id', productId)
          .maybeSingle()
        const needsScan =
          !prod ||
          prod.acidity == null ||
          prod.polyphenols == null ||
          prod.oleocanthal == null ||
          prod.peroxide_value == null ||
          prod.oleic_acid_pct == null
        if (needsScan && insertedRows.length > 0) {
          // Lab-looking photos first (heuristika), pak zbytek
          const sorted = [...insertedRows].sort((a, b) => {
            const aLab = looksLikeLabReport(a.url as string, null) ? 0 : 1
            const bLab = looksLikeLabReport(b.url as string, null) ? 0 : 1
            return aLab - bLab
          })
          for (const row of sorted) {
            const lab = await scanLabReport(row.url as string)
            if (lab.confidence === 'low') continue   // not useful, try next
            const patch: Record<string, number> = {}
            if (prod?.acidity == null && lab.acidity != null) patch.acidity = lab.acidity
            if (prod?.polyphenols == null && lab.polyphenols != null) patch.polyphenols = lab.polyphenols
            if (prod?.oleocanthal == null && lab.oleocanthal != null) patch.oleocanthal = lab.oleocanthal
            if (prod?.peroxide_value == null && lab.peroxideValue != null) patch.peroxide_value = lab.peroxideValue
            if (prod?.oleic_acid_pct == null && lab.oleicAcidPct != null) patch.oleic_acid_pct = lab.oleicAcidPct
            if (Object.keys(patch).length > 0) {
              await supabaseAdmin.from('products').update(patch).eq('id', productId)
            }
            break  // got a useful scan — stop
          }
        }
      } catch (err) {
        console.warn('[discovery] lab auto-scan failed:', err instanceof Error ? err.message : err)
      }

      // 3. Update products.image_url to the primary's hosted URL.
      //    Re-read primary row (URL was just updated by step 2).
      if (toPublish.length > 0 && !hasExistingApproved) {
        const { data: primaryRow } = await supabaseAdmin
          .from('product_images')
          .select('url')
          .eq('product_id', productId)
          .eq('is_primary', true)
          .maybeSingle()
        if (primaryRow?.url) {
          await supabaseAdmin
            .from('products')
            .update({ image_url: primaryRow.url as string, image_source: 'discovery_agent' })
            .eq('id', productId)
        }
      }
    } catch (err) {
      console.warn('[discovery] gallery insert failed:', err)
    }
  }

  // AI pipeline (best-effort, don't block on individual failures)
  try {
    if (scraped.rawDescription && scraped.rawDescription.length > 30) {
      const facts = await extractFactsFromText(scraped.rawDescription)
      if (facts.length > 0) {
        await supabaseAdmin
          .from('products')
          .update({ extracted_facts: facts })
          .eq('id', productId)
      }
    }
  } catch (err) {
    console.warn('[discovery] facts extraction:', err)
  }

  try {
    if (scraped.rawDescription) {
      const flavor = await estimateFlavorProfile({
        name: scraped.name,
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
    }
  } catch (err) {
    console.warn('[discovery] flavor estimation:', err)
  }

  // Score
  const score = calculateScore({
    acidity: scraped.acidity,
    polyphenols: scraped.polyphenols,
    peroxideValue: scraped.peroxideValue,
    certifications: detectedCerts,
    pricePer100ml:
      scraped.price && scraped.volumeMl ? (scraped.price / scraped.volumeMl) * 100 : null,
  })
  await supabaseAdmin
    .from('products')
    .update({ olivator_score: score.total, score_breakdown: score.breakdown })
    .eq('id', productId)

  // Use cases
  const { data: flavorRow } = await supabaseAdmin
    .from('products')
    .select('flavor_profile')
    .eq('id', productId)
    .maybeSingle()
  const derived = deriveUseCases({
    type: scraped.type,
    acidity: scraped.acidity,
    polyphenols: scraped.polyphenols,
    flavorProfile: (flavorRow?.flavor_profile as Record<string, number>) ?? null,
    pricePerLiter:
      scraped.price && scraped.volumeMl ? (scraped.price / scraped.volumeMl) * 1000 : null,
    packaging: scraped.packaging,
    certifications: detectedCerts,
  })
  await supabaseAdmin
    .from('products')
    .update({ use_cases: derived.useCases })
    .eq('id', productId)

  // AI rewrite (Sonnet — most expensive step). Saves description but
  // keeps status='draft' — pre-publish gate decides activation below.
  try {
    const generated = await generateProductDescriptions({
      name: scraped.name,
      brand: scraped.brand,
      origin: scraped.originCountry ? countryName(scraped.originCountry) : null,
      region: scraped.originRegion,
      type: scraped.type,
      volumeMl: scraped.volumeMl,
      acidity: scraped.acidity,
      polyphenols: scraped.polyphenols,
      certifications: detectedCerts,
      olivatorScore: score.total,
      rawDescription: scraped.rawDescription,
    })
    await supabaseAdmin
      .from('products')
      .update({
        description_short: generated.shortDescription,
        description_long: generated.longDescription,
        ai_generated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    // SEO meta_description — Haiku-generated 130-160 char snippet pro Google
    // search result. Best-effort, blokuje activation jen pokud chce admin.
    try {
      const meta = await generateMetaDescription({
        name: scraped.name,
        shortDescription: generated.shortDescription,
        originCountry: scraped.originCountry,
        originRegion: scraped.originRegion,
        acidity: scraped.acidity,
        polyphenols: scraped.polyphenols,
        certifications: detectedCerts,
        olivatorScore: score.total,
      })
      const trimmed = meta.length <= 160 ? meta : (meta.slice(0, 160).replace(/\s+\S*$/, '') || meta.slice(0, 160))
      if (trimmed.length >= 50) {
        await supabaseAdmin
          .from('products')
          .update({ meta_description: trimmed })
          .eq('id', productId)
      }
    } catch (err) {
      console.warn('[discovery] meta_description gen failed:', err instanceof Error ? err.message : err)
    }
  } catch (err) {
    console.warn('[discovery] AI rewrite failed, leaving as draft:', err)
  }

  // ── ENTITY LINKING ──
  // Extract brand_slug + region_slug + cultivar links pro nový produkt
  // a recompute aggregate dat (cultivar.flavor_profile, intensity).
  // Best-effort — selhání nesmí blokovat publish.
  try {
    const { linkAndRecomputeForProduct } = await import('@/lib/entity-aggregator')
    await linkAndRecomputeForProduct(
      productId,
      scraped.name,
      scraped.originCountry,
      scraped.originRegion,
      scraped.rawDescription
    )
  } catch (err) {
    console.warn('[discovery] entity linking failed:', err)
  }

  // ── PRE-PUBLISH GATE ──
  // Run full quality audit + auto-fix. If errors remain, leave product as
  // draft and surface reasoning in discovery_candidates. Prevents pipeline
  // from auto-publishing broken products (missing image, bio claim without
  // cert, etc.). Admin can manually publish anyway via /admin/products.
  try {
    const gate = await runPrePublishAudit(productId)
    if (gate.canPublish) {
      await supabaseAdmin
        .from('products')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', productId)
    } else {
      // Block: stay as draft, log reasons
      const reasons = gate.blockingErrors.map(e => `${e.ruleId}: ${e.message}`).join(' · ')
      console.warn(`[discovery] pre-publish gate BLOCKED ${productId}:`, reasons)
      // Persist reason on product (so admin sees "draft because: ...")
      await supabaseAdmin
        .from('products')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
    }
  } catch (err) {
    console.warn('[discovery] pre-publish gate failed:', err)
    // Conservative: if gate itself errors, leave as draft
  }

  return productId
}

/** Add new offer to existing matched product, no new product created. */
async function addOfferToExisting(
  matchedProductId: string,
  scraped: ScrapedProduct,
  retailerSlug: string
): Promise<string> {
  const { data: retailer } = await supabaseAdmin
    .from('retailers')
    .select('id')
    .eq('slug', retailerSlug)
    .maybeSingle()
  if (!retailer) throw new Error(`Retailer ${retailerSlug} not found`)

  const { data: created, error } = await supabaseAdmin
    .from('product_offers')
    .upsert(
      {
        product_id: matchedProductId,
        retailer_id: retailer.id,
        price: scraped.price,
        currency: scraped.currency ?? 'CZK',
        in_stock: scraped.inStock ?? true,
        product_url: scraped.url,
      },
      { onConflict: 'product_id,retailer_id' }
    )
    .select('id')
    .single()
  if (error || !created) throw new Error(`Offer upsert failed: ${error?.message}`)

  // Historický záznam — jeden řádek per run, grafy vývoje ceny
  if (scraped.price) {
    await supabaseAdmin.from('price_history').insert({
      product_id: matchedProductId,
      retailer_id: retailer.id,
      price: scraped.price,
      in_stock: scraped.inStock ?? true,
    })
  }

  return created.id as string
}

/** Main agent runner. Crawls all enabled shops, processes new candidates,
 *  respects daily limit, returns summary. */
export async function runDiscoveryAgent(): Promise<DiscoveryRunResult> {
  // Source of truth: discovery_sources table (status='enabled').
  // Old setting 'discovery_enabled_shops' is deprecated but kept as fallback
  // for migration period — if DB has 0 enabled, try setting.
  let enabledShops = await getKnownShopSlugs()
  if (enabledShops.length === 0) {
    enabledShops = (await getSetting<string[]>('discovery_enabled_shops')) ?? []
  }

  // Skip retailery, kteří mají vyplněný XML feed — ti běží přes cron:feed-sync
  // (Heureka XML parser, rychlejší + bez Playwright). Bez tohoto filtru bychom
  // měli denně 2× upsert do product_offers + 2× insert do price_history pro
  // stejný produkt = duplikáty v grafu cenového vývoje.
  const xmlBackedSlugs = await getRetailerSlugsWithXmlFeed()
  const skippedXml = enabledShops.filter(s => xmlBackedSlugs.has(s))
  enabledShops = enabledShops.filter(s => !xmlBackedSlugs.has(s))
  if (skippedXml.length > 0) {
    console.log(`[discovery] skip ${skippedXml.length} retailer(s) — XML feed je řeší: ${skippedXml.join(', ')}`)
  }

  const dailyLimit = (await getSetting<number>('discovery_daily_limit')) ?? 5
  const autoPublish = (await getSetting<boolean>('discovery_auto_publish')) ?? false

  const result: DiscoveryRunResult = {
    shopsCrawled: 0,
    totalUrlsFound: 0,
    newCandidates: 0,
    autoPublished: 0,
    autoAddedOffers: 0,
    needsReview: 0,
    failed: 0,
    errors: [],
    shopErrors: [],
    candidateIds: [],
  }

  const crawlResults = await crawlShops(enabledShops)
  result.shopsCrawled = crawlResults.length

  // HOIST: dedup query běží JEN JEDNOU pro celý běh, ne per-shop.
  // Dříve jsme ji volali uvnitř for (cr of crawlResults) — 5 shopů × 2 dotazy
  // = 10 zbytečných round-tripů. S rostoucí DB to byl perf killer.
  const { data: existingOffers } = await supabaseAdmin
    .from('product_offers')
    .select('product_url')
  const offerUrls = new Set((existingOffers ?? []).map(o => o.product_url as string))

  const { data: existingCandidates } = await supabaseAdmin
    .from('discovery_candidates')
    .select('source_url, status')
  const candidateUrls = new Set(
    (existingCandidates ?? [])
      .filter(c => c.status !== 'failed')
      .map(c => c.source_url as string)
  )
  const seenUrls = new Set([...offerUrls, ...candidateUrls])

  for (const cr of crawlResults) {
    if (cr.error) {
      result.shopErrors.push({ shop: cr.shopSlug, error: cr.error })
      continue
    }
    result.totalUrlsFound += cr.urls.length

    // Dedup: skip URLs already seen (hoistnuto před lock)
    const newUrls = cr.urls.filter(u => !seenUrls.has(u))

    let processedFromShop = 0
    for (let urlIdx = 0; urlIdx < newUrls.length; urlIdx++) {
      const url = newUrls[urlIdx]
      // Respect daily limit (across all shops)
      if (processedFromShop + result.newCandidates >= dailyLimit) break

      // Polite delay 2-8s mezi produkty stejného shopu (CLAUDE.md sekce 14).
      // Bez tohoto bychom v 1 minutě udělali 30+ Playwright requestů na stejný
      // host = bot signal → IP block. Pro první URL skip, pak 2-8s random.
      if (urlIdx > 0) {
        const delayMs = 2000 + Math.floor(Math.random() * 6000)
        await new Promise((r) => setTimeout(r, delayMs))
      }

      try {
        const scraped = await scrapeProductPage(url)
        const match = await matchProduct(scraped)
        const quality = assessQuality(scraped)

        let finalStatus: CandidateStatus = 'pending'
        let reasoning = match.reasoning
        let resultingProductId: string | null = null
        let resultingOfferId: string | null = null

        if (match.matchType === 'ean' && match.matchedProductId) {
          // Existing product, new retailer → just add offer
          try {
            resultingOfferId = await addOfferToExisting(match.matchedProductId, scraped, cr.shopSlug)
            finalStatus = 'auto_added_offer'
            resultingProductId = match.matchedProductId
            reasoning += ' → přidán nový offer'
            result.autoAddedOffers++
          } catch (err) {
            finalStatus = 'failed'
            reasoning += ` → failed: ${err instanceof Error ? err.message : 'unknown'}`
            result.failed++
          }
        } else if (match.matchType === 'fuzzy_name' && match.matchConfidence >= 0.85) {
          // High-confidence fuzzy match → admin should confirm before adding offer
          finalStatus = 'needs_review'
          reasoning += ' → ručně potvrď jestli je to ten samý produkt'
          result.needsReview++
        } else if (match.matchType === 'fuzzy_name') {
          // Lower-confidence — flag for review
          finalStatus = 'needs_review'
          result.needsReview++
        } else {
          // Truly new
          if (autoPublish && quality.quality === 'high') {
            try {
              resultingProductId = await publishCandidate(scraped, cr.shopSlug, cr.shopDomain)
              // Verify final status — gate may have blocked publishing
              const { data: finalProduct } = await supabaseAdmin
                .from('products')
                .select('status')
                .eq('id', resultingProductId)
                .maybeSingle()
              if (finalProduct?.status === 'active') {
                finalStatus = 'auto_published'
                reasoning = `AUTO-PUBLISHED: ${quality.reasoning}`
                result.autoPublished++
              } else {
                // Pre-publish gate blocked — needs admin review
                const { data: blockingIssues } = await supabaseAdmin
                  .from('quality_issues')
                  .select('rule_id, message')
                  .eq('product_id', resultingProductId)
                  .eq('status', 'open')
                  .eq('severity', 'error')
                const reasons = (blockingIssues ?? [])
                  .map(b => b.rule_id as string)
                  .join(', ')
                finalStatus = 'needs_review'
                reasoning = `Pipeline doběhla, ale Quality gate blokoval publish: ${reasons || 'unknown errors'}. Otevři produkt → vyřeš issues → publikuj ručně.`
                result.needsReview++
              }
            } catch (err) {
              finalStatus = 'failed'
              reasoning = `Failed during publish: ${err instanceof Error ? err.message : 'unknown'}`
              result.failed++
            }
          } else {
            finalStatus = 'needs_review'
            reasoning = `Nový produkt — ${quality.reasoning} — čeká na schválení`
            result.needsReview++
          }
        }

        // Persist candidate
        const { data: cand } = await supabaseAdmin
          .from('discovery_candidates')
          .insert({
            source_url: url,
            source_domain: cr.shopDomain,
            matched_product_id: match.matchedProductId,
            match_type: match.matchType,
            match_confidence: match.matchConfidence,
            candidate_data: scraped as unknown as Record<string, unknown>,
            status: finalStatus,
            reasoning,
            resulting_product_id: resultingProductId,
            resulting_offer_id: resultingOfferId,
          })
          .select('id')
          .single()
        if (cand?.id) result.candidateIds.push(cand.id as string)

        result.newCandidates++
        processedFromShop++

        // Be polite — 3 sec between scrape calls
        await new Promise(r => setTimeout(r, 3000))
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'scrape failed'
        // Normalize unhelpful errors
        const friendly = errMsg.includes('did not match the expected pattern')
          ? 'URL parsing error (možná chybný encoding)'
          : errMsg
        result.errors.push(`${url}: ${friendly}`)
        result.failed++
        console.warn(`[discovery] URL failed: ${url}`, err)
      }
    }
  }

  return result
}
