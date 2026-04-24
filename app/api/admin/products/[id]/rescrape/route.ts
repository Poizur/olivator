import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeProductPage } from '@/lib/product-scraper'
import { applyRescrapePatch, updateProductFacts } from '@/lib/data'
import { extractFactsFromText } from '@/lib/fact-extractor'
import { estimateFlavorProfile } from '@/lib/flavor-agent'
import { generateProductDescriptions } from '@/lib/content-agent'
import { calculateScore } from '@/lib/score'
import { countryName } from '@/lib/utils'

export const maxDuration = 90 // full pipeline: scrape + facts + flavor + rewrite + score

/** Full-pipeline rescrape: scrape source → facts → flavor → AI rewrite → Score → gallery URLs.
 *  One click populates everything. Admin then just picks which gallery images to keep. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const steps: string[] = []
  const failures: string[] = []
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const overrideUrl: string | undefined = body?.url

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('source_url')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const url = overrideUrl?.trim() || (product.source_url as string | null)
    if (!url) {
      return NextResponse.json(
        { error: 'Produkt nemá uloženou zdrojovou URL. Pošli URL v těle požadavku.' },
        { status: 400 }
      )
    }

    // ── 1. Scrape ──────────────────────────────────────────────────────
    const scraped = await scrapeProductPage(url)
    steps.push(`scrape (${scraped.rawDescription?.length ?? 0} znaků)`)

    // ── 2. Patch NULL fields (acidity, peroxide, volume, ean, packaging) ──
    const { filled } = await applyRescrapePatch(id, {
      sourceUrl: url,
      rawDescription: scraped.rawDescription,
      ean: scraped.ean,
      acidity: scraped.acidity,
      polyphenols: scraped.polyphenols,
      peroxideValue: scraped.peroxideValue,
      volumeMl: scraped.volumeMl,
      packaging: scraped.packaging,
    })
    if (filled.length > 0) steps.push(`doplněno: ${filled.join(', ')}`)

    // ── 3. Save gallery URLs (no download — admin picks what to keep) ──
    if (scraped.galleryImages.length > 0) {
      // Delete existing scraped images for this product (keep manually-uploaded by source='manual')
      await supabaseAdmin
        .from('product_images')
        .delete()
        .eq('product_id', id)
        .eq('source', 'scraper_candidate')

      const rows = scraped.galleryImages.map((img, i) => ({
        product_id: id,
        url: img.url,
        alt_text: img.alt,
        is_primary: i === 0,
        sort_order: i,
        source: 'scraper_candidate', // not yet downloaded — admin must approve
      }))
      const { error: imgErr } = await supabaseAdmin.from('product_images').insert(rows)
      if (imgErr) failures.push(`galerie: ${imgErr.message}`)
      else steps.push(`galerie ${rows.length} fotek uloženo (čeká na výběr)`)
    }

    // ── 4. Facts (Haiku) ────────────────────────────────────────────────
    let factsCount = 0
    if (scraped.rawDescription && scraped.rawDescription.length > 30) {
      try {
        const facts = await extractFactsFromText(scraped.rawDescription)
        await updateProductFacts(id, facts)
        factsCount = facts.length
        steps.push(`${facts.length} faktů`)
      } catch (err) {
        failures.push(`fakta: ${err instanceof Error ? err.message : 'chyba'}`)
      }
    }

    // ── 5. Flavor profile (Haiku) ───────────────────────────────────────
    let flavorReasoning: string | null = null
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
          .update({
            flavor_profile: { fruity, herbal, bitter, spicy, mild, nutty, buttery },
          })
          .eq('id', id)
        flavorReasoning = flavor.reasoning
        steps.push('chuťový profil')
      } catch (err) {
        failures.push(`chuť: ${err instanceof Error ? err.message : 'chyba'}`)
      }
    }

    // ── 6. Score recalculation ──────────────────────────────────────────
    // Re-read product + cheapest offer price to compute value
    const { data: freshProduct } = await supabaseAdmin
      .from('products')
      .select('acidity, polyphenols, peroxide_value, certifications, volume_ml')
      .eq('id', id)
      .maybeSingle()
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price')
      .eq('product_id', id)
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
      .update({
        olivator_score: score.total,
        score_breakdown: score.breakdown,
      })
      .eq('id', id)
    steps.push(`Score ${score.total}/100`)

    // ── 7. AI rewrite (Sonnet) — with fresh raw_description + facts ─────
    let descriptionsGenerated = false
    let validationWarnings = 0
    if (scraped.rawDescription && scraped.rawDescription.length > 100) {
      try {
        const { data: factsRow } = await supabaseAdmin
          .from('products')
          .select('extracted_facts')
          .eq('id', id)
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
          .eq('id', id)
        descriptionsGenerated = true
        // Quick check: count banned phrase hits (informational only)
        const full = `${generated.shortDescription} ${generated.longDescription}`.toLowerCase()
        const bannedHints = ['šetrné zpracov', 'prémiov', 'výjimečn', 'místních odrůd', 'lehčí středomořsk']
        validationWarnings = bannedHints.filter(b => full.includes(b)).length
        steps.push(
          validationWarnings === 0
            ? 'AI popisy (čisté)'
            : `AI popisy (${validationWarnings} vata-fráze — zkontroluj)`
        )
      } catch (err) {
        failures.push(`AI popisy: ${err instanceof Error ? err.message : 'chyba'}`)
      }
    }

    await supabaseAdmin
      .from('products')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({
      ok: true,
      steps,
      failures,
      filled,
      factsCount,
      flavorReasoning,
      scoreTotal: score.total,
      scoreBreakdown: score.breakdown,
      descriptionsGenerated,
      validationWarnings,
      galleryCount: scraped.galleryImages.length,
      rawDescriptionLength: scraped.rawDescription?.length ?? 0,
    })
  } catch (err) {
    console.error('[rescrape]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message, stepsCompleted: steps, failures }, { status: 500 })
  }
}
