import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { scanLabReport } from '@/lib/lab-report-agent'
import { calculateScore } from '@/lib/score'
import { revalidateProduct } from '@/lib/revalidate'

export const maxDuration = 45

/** POST — scan a gallery image for lab data, merge into product (only fills NULL fields). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const imageUrl: string | undefined = body?.imageUrl
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'imageUrl je povinná' }, { status: 400 })
    }

    // Scan image with Claude Vision
    const lab = await scanLabReport(imageUrl)

    if (lab.confidence === 'low') {
      return NextResponse.json({
        ok: true,
        lab,
        filled: [],
        message: 'Obrázek nevypadá jako lab report nebo hodnoty nebyly čitelné.',
      })
    }

    // Read current product to only fill NULL fields
    const { data: product, error: readErr } = await supabaseAdmin
      .from('products')
      .select('acidity, polyphenols, oleocanthal, peroxide_value, oleic_acid_pct, certifications, volume_ml, type')
      .eq('id', id)
      .maybeSingle()
    if (readErr) throw readErr
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const filled: string[] = []
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (product.acidity == null && lab.acidity != null) {
      payload.acidity = lab.acidity
      filled.push(`kyselost ${lab.acidity}%`)
    }
    if (product.polyphenols == null && lab.polyphenols != null) {
      payload.polyphenols = lab.polyphenols
      filled.push(`polyfenoly ${lab.polyphenols} mg/kg`)
    }
    if (product.oleocanthal == null && lab.oleocanthal != null) {
      payload.oleocanthal = lab.oleocanthal
      filled.push(`oleokantal ${lab.oleocanthal} mg/kg`)
    }
    if (product.peroxide_value == null && lab.peroxideValue != null) {
      payload.peroxide_value = lab.peroxideValue
      filled.push(`peroxid ${lab.peroxideValue}`)
    }
    if (product.oleic_acid_pct == null && lab.oleicAcidPct != null) {
      payload.oleic_acid_pct = lab.oleicAcidPct
      filled.push(`kys. olejová ${lab.oleicAcidPct}%`)
    }

    if (Object.keys(payload).length > 1) {
      const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update(payload)
        .eq('id', id)
      if (updateErr) throw updateErr
    }

    // Recalculate Score with updated values
    let newScore: number | null = null
    let scoreBreakdown = null
    if (filled.length > 0) {
      const acidity = (payload.acidity as number | undefined) ?? (product.acidity != null ? Number(product.acidity) : null)
      const polyphenols = (payload.polyphenols as number | undefined) ?? product.polyphenols ?? null
      const peroxide = (payload.peroxide_value as number | undefined) ?? (product.peroxide_value != null ? Number(product.peroxide_value) : null)

      const { data: offers } = await supabaseAdmin
        .from('product_offers')
        .select('price')
        .eq('product_id', id)
        .order('price', { ascending: true })
        .limit(1)
      const cheapestPrice = offers?.[0]?.price ? Number(offers[0].price) : null
      const volumeMl = product.volume_ml ? Number(product.volume_ml) : null
      const pricePer100ml = cheapestPrice && volumeMl ? (cheapestPrice / volumeMl) * 100 : null

      const score = calculateScore({
        acidity,
        polyphenols,
        peroxideValue: peroxide,
        certifications: (product.certifications as string[]) ?? [],
        pricePer100ml,
        type: (product.type as string) ?? null,
      })
      const dbScoreValue = score.insufficientData ? null : score.total
      await supabaseAdmin
        .from('products')
        .update({ olivator_score: dbScoreValue, score_breakdown: score.breakdown })
        .eq('id', id)
      newScore = dbScoreValue
      scoreBreakdown = score.breakdown
    }

    if (filled.length > 0) await revalidateProduct(id)

    return NextResponse.json({
      ok: true,
      lab,
      filled,
      newScore,
      scoreBreakdown,
      message: filled.length > 0
        ? `Doplněno: ${filled.join(', ')}. Score ${newScore}/100.`
        : 'Lab report přečten, ale všechna pole už byla vyplněna. Hodnoty nepřepisuji.',
    })
  } catch (err) {
    console.error('[scan-lab-report]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
