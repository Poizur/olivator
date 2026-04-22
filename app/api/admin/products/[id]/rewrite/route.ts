import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateProductDescriptions } from '@/lib/content-agent'
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

    const result = await generateProductDescriptions({
      name: product.name as string,
      brand: null, // extracted from name inside content agent if needed
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

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[rewrite]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
