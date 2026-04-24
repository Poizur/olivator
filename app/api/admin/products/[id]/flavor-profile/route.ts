import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { estimateFlavorProfile } from '@/lib/flavor-agent'

export const maxDuration = 30

/** AI-estimate the flavor profile (7 axes 0-100) from product data + raw description. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select(
        'name, raw_description, description_short, acidity, polyphenols, origin_country, origin_region, type'
      )
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const estimate = await estimateFlavorProfile({
      name: product.name as string,
      rawDescription: (product.raw_description as string) ?? null,
      shortDescription: (product.description_short as string) ?? null,
      acidity: (product.acidity as number) ?? null,
      polyphenols: (product.polyphenols as number) ?? null,
      originCountry: (product.origin_country as string) ?? null,
      originRegion: (product.origin_region as string) ?? null,
      type: (product.type as string) ?? null,
    })

    // Save immediately to DB so it persists without requiring a separate Save click
    const { fruity, herbal, bitter, spicy, mild, nutty, buttery } = estimate
    const flavorProfile = { fruity, herbal, bitter, spicy, mild, nutty, buttery }
    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update({
        flavor_profile: flavorProfile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (updateErr) throw updateErr

    return NextResponse.json({ ok: true, flavorProfile, reasoning: estimate.reasoning })
  } catch (err) {
    console.error('[flavor-profile]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
