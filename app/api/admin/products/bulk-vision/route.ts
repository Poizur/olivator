import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateImageAltText } from '@/lib/product-image'
import { scanLabReport, looksLikeLabReport } from '@/lib/lab-report-agent'
import { calculateScore } from '@/lib/score'

export const maxDuration = 600 // 10 min — vision iterace přes ~200 fotek

interface ImgRow {
  id: string
  product_id: string
  url: string
  alt_text: string | null
}

interface ProductRow {
  id: string
  name: string
  slug: string
  acidity: number | null
  polyphenols: number | null
  oleocanthal: number | null
  peroxide_value: number | null
  oleic_acid_pct: number | null
  certifications: string[] | null
  volume_ml: number | null
  type: string | null
}

async function getCheapestPricePer100ml(productId: string, volumeMl: number | null): Promise<number | null> {
  if (!volumeMl || volumeMl <= 0) return null
  const { data } = await supabaseAdmin
    .from('product_offers')
    .select('price')
    .eq('product_id', productId)
    .eq('in_stock', true)
    .order('price', { ascending: true })
    .limit(1)
  const cheapest = data?.[0]?.price
  if (cheapest == null) return null
  return Number(((Number(cheapest) / volumeMl) * 100).toFixed(2))
}

/** Bulk Vision pass:
 *  1. Generate AI alt text for all published photos with rule-based alt
 *  2. Auto-scan lab photos for products with NULL chemistry, fill values + recalc Score
 *  Idempotentní — opakované volání jen domění chybějící. */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  // ── Step 1: Vision alt text ─────────────────────────────────────
  // Re-generate pro všechny scraper-source fotky (nahradí rule-based defaults)
  const { data: imgs } = await supabaseAdmin
    .from('product_images')
    .select('id, product_id, url, alt_text')
    .eq('source', 'scraper')
    .returns<ImgRow[]>()
  let altOk = 0
  let altFailed = 0
  const productIds = [...new Set((imgs ?? []).map((i) => i.product_id))]
  const { data: productNames } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .in('id', productIds)
  const nameMap = new Map<string, string>()
  for (const p of productNames ?? []) nameMap.set(p.id as string, p.name as string)

  // Filter: only photos where alt_text is missing OR looks rule-based
  const ruleBasedRegex = /^[^—]+(— pohled \d+)?$/
  const toProcess = (imgs ?? []).filter((img) => {
    if (!img.alt_text) return true
    return ruleBasedRegex.test(img.alt_text.trim()) // looks like rule-based template
  })

  for (const img of toProcess) {
    const name = nameMap.get(img.product_id)
    if (!name) { altFailed++; continue }
    try {
      const alt = await generateImageAltText(img.url, name)
      await supabaseAdmin.from('product_images').update({ alt_text: alt }).eq('id', img.id)
      altOk++
    } catch {
      altFailed++
    }
  }

  // ── Step 2: Lab scan ─────────────────────────────────────────────
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, acidity, polyphenols, oleocanthal, peroxide_value, oleic_acid_pct, certifications, volume_ml, type')
    .eq('status', 'active')
    .returns<ProductRow[]>()
  const needScan = (products ?? []).filter(
    (p) => p.acidity == null || p.polyphenols == null || p.oleocanthal == null || p.peroxide_value == null || p.oleic_acid_pct == null
  )

  let labScanned = 0
  let labUpdated = 0
  for (const p of needScan) {
    const { data: pImgs } = await supabaseAdmin
      .from('product_images')
      .select('url, alt_text')
      .eq('product_id', p.id)
      .neq('source', 'scraper_candidate')
    // Lab-looking photos first, then all others
    const sorted = [...(pImgs ?? [])].sort((a, b) => {
      const aL = looksLikeLabReport(a.url as string, a.alt_text as string | null) ? 0 : 1
      const bL = looksLikeLabReport(b.url as string, b.alt_text as string | null) ? 0 : 1
      return aL - bL
    })
    try {
      for (const img of sorted) {
        const lab = await scanLabReport(img.url as string)
        labScanned++
        if (lab.confidence === 'low') continue
        const patch: Record<string, number> = {}
        if (p.acidity == null && lab.acidity != null) patch.acidity = lab.acidity
        if (p.polyphenols == null && lab.polyphenols != null) patch.polyphenols = lab.polyphenols
        if (p.oleocanthal == null && lab.oleocanthal != null) patch.oleocanthal = lab.oleocanthal
        if (p.peroxide_value == null && lab.peroxideValue != null) patch.peroxide_value = lab.peroxideValue
        if (p.oleic_acid_pct == null && lab.oleicAcidPct != null) patch.oleic_acid_pct = lab.oleicAcidPct
        if (Object.keys(patch).length > 0) {
          const merged = { ...p, ...patch }
          const pricePer100ml = await getCheapestPricePer100ml(p.id, p.volume_ml)
          const score = calculateScore({
            acidity: merged.acidity,
            certifications: merged.certifications,
            polyphenols: merged.polyphenols,
            peroxideValue: merged.peroxide_value,
            pricePer100ml,
            type: merged.type,
          })
          await supabaseAdmin
            .from('products')
            .update({
              ...patch,
              olivator_score: score.insufficientData ? null : score.total,
              score_breakdown: score.breakdown,
              updated_at: new Date().toISOString(),
            })
            .eq('id', p.id)
          labUpdated++
        }
        break  // got a useful scan — stop trying more photos
      }
    } catch {
      // ignore — lab scan can fail on noise photos
    }
  }

  return NextResponse.json({
    ok: true,
    alt_processed: altOk,
    alt_failed: altFailed,
    alt_skipped: (imgs?.length ?? 0) - toProcess.length,
    lab_scanned: labScanned,
    lab_updated: labUpdated,
  })
}
