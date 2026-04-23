import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateProductDescriptions } from '@/lib/content-agent'
import { validateContent } from '@/lib/content-validator'
import { countryName } from '@/lib/utils'

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const rawDescription: string | undefined = body?.rawDescription

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const generated = await generateProductDescriptions({
      name: product.name as string,
      brand: null,
      origin: product.origin_country ? countryName(product.origin_country as string) : null,
      region: (product.origin_region as string) ?? null,
      type: (product.type as string) ?? null,
      volumeMl: (product.volume_ml as number) ?? null,
      acidity: (product.acidity as number) ?? null,
      polyphenols: (product.polyphenols as number) ?? null,
      certifications: (product.certifications as string[]) ?? [],
      olivatorScore: (product.olivator_score as number) ?? null,
      rawDescription: rawDescription ?? (product.description_long as string) ?? (product.description_short as string) ?? null,
    })

    // Run automated QA — catches banned phrases, hallucinations, missing data
    const validation = validateContent({
      shortDescription: generated.shortDescription,
      longDescription: generated.longDescription,
      acidity: (product.acidity as number) ?? null,
      polyphenols: (product.polyphenols as number) ?? null,
      region: (product.origin_region as string) ?? null,
      country: (product.origin_country as string) ?? null,
      certifications: (product.certifications as string[]) ?? [],
    })

    return NextResponse.json({ ok: true, ...generated, validation })
  } catch (err) {
    console.error('[rewrite]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
