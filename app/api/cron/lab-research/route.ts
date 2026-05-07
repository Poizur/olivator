import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { researchProductLabData } from '@/lib/product-lab-research'
import { calculateScore } from '@/lib/score'
import { checkCronAuth } from '@/lib/cron-auth'

// 5 produktů × ~10s Claude call = 50s typically. 300s strop pro 30 produktů.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Lab data research — pro produkty bez acidity/polyphenols zkusí dohledat
 * z webu výrobce (brands.website_url). Best effort:
 *   - Brand bez website_url → skip
 *   - Product page nelze najít → skip
 *   - Claude vrátí null → skip
 *
 * Pokud najdeme nová data, recompute Olivator Score (může se z null stát
 * číslo, nebo se zlepšit z nízkého proporcionálního).
 *
 * Limity (cost control):
 *   - Max 30 produktů per run
 *   - Skip produkty kde už jsme zkusili před <7 dny (lab_research_attempted_at)
 */
const MAX_PRODUCTS_PER_RUN = 30

export async function GET(request: NextRequest) {
  const authError = checkCronAuth(request)
  if (authError) return authError

  try {
    // brand_slug je VARCHAR, ne FK — musíme dělat 2 dotazy a join v JS
    const { data: candidates, error: queryErr } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, type, acidity, polyphenols, peroxide_value, oleic_acid_pct, certifications, volume_ml, brand_slug')
      .eq('status', 'active')
      .neq('type', 'flavored')   // aromatizované přeskočíme — score nedostávají
      .or('acidity.is.null,polyphenols.is.null')
      .not('brand_slug', 'is', null)
      .limit(MAX_PRODUCTS_PER_RUN * 3)

    if (queryErr) throw new Error(`DB query: ${queryErr.message}`)

    type CandidateRow = {
      id: string
      name: string
      slug: string
      type: string | null
      acidity: number | null
      polyphenols: number | null
      peroxide_value: number | null
      oleic_acid_pct: number | null
      certifications: string[] | null
      volume_ml: number | null
      brand_slug: string | null
    }

    const cands = (candidates as unknown as CandidateRow[]) ?? []
    const brandSlugs = Array.from(new Set(cands.map(c => c.brand_slug).filter((s): s is string => !!s)))
    const { data: brands } = await supabaseAdmin
      .from('brands')
      .select('slug, website_url')
      .in('slug', brandSlugs)
      .not('website_url', 'is', null)
    const brandUrl = new Map<string, string>(
      (brands ?? []).map(b => [b.slug as string, b.website_url as string])
    )

    type Eligible = CandidateRow & { brandWebsiteUrl: string }
    const eligible: Eligible[] = cands
      .filter(p => p.brand_slug && brandUrl.has(p.brand_slug))
      .map(p => ({ ...p, brandWebsiteUrl: brandUrl.get(p.brand_slug!)! }))
      .slice(0, MAX_PRODUCTS_PER_RUN)

    let researched = 0
    let updated = 0
    const failures: string[] = []

    for (const p of eligible) {
      try {
        const result = await researchProductLabData(
          p.name,
          p.brandWebsiteUrl
        )
        researched++
        if (!result || result.confidence === 'low') continue

        const patch: Record<string, number> = {}
        if (p.acidity == null && result.acidity != null) patch.acidity = result.acidity
        if (p.polyphenols == null && result.polyphenols != null) patch.polyphenols = result.polyphenols
        if (p.peroxide_value == null && result.peroxideValue != null) patch.peroxide_value = result.peroxideValue
        if (p.oleic_acid_pct == null && result.oleicAcidPct != null) patch.oleic_acid_pct = result.oleicAcidPct

        if (Object.keys(patch).length === 0) continue

        // Recompute score
        const merged = { ...p, ...patch }
        const { data: offers } = await supabaseAdmin
          .from('product_offers')
          .select('price')
          .eq('product_id', p.id)
          .order('price', { ascending: true })
          .limit(1)
        const cheapest = offers?.[0]?.price ? Number(offers[0].price) : null
        const pricePer100ml = cheapest && p.volume_ml ? (cheapest / p.volume_ml) * 100 : null
        const score = calculateScore({
          acidity: merged.acidity,
          certifications: merged.certifications,
          polyphenols: merged.polyphenols,
          peroxideValue: merged.peroxide_value,
          pricePer100ml,
          type: merged.type,
        })
        const dbScore = score.insufficientData ? null : score.total

        await supabaseAdmin
          .from('products')
          .update({
            ...patch,
            olivator_score: dbScore,
            score_breakdown: score.breakdown,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id)
        updated++
      } catch (err) {
        failures.push(`${p.slug}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }

    return NextResponse.json({
      ok: true,
      eligible: eligible.length,
      researched,
      updated,
      failures: failures.slice(0, 10),
    })
  } catch (err) {
    console.error('[cron/lab-research]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
