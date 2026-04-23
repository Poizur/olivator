import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { updateProductFacts } from '@/lib/data'
import { extractFactsFromText } from '@/lib/fact-extractor'

export const maxDuration = 30

/** Replace full facts array (from admin manual editing). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    if (!Array.isArray(body.facts)) {
      return NextResponse.json({ error: 'facts must be array' }, { status: 400 })
    }
    await updateProductFacts(id, body.facts)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[facts PUT]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

/** Re-extract facts from product.description_long using Claude. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('description_long, description_short')
      .eq('id', id)
      .maybeSingle()
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const rawText =
      (product.description_long as string) ||
      (product.description_short as string) ||
      ''
    if (!rawText || rawText.length < 30) {
      return NextResponse.json({
        error: 'Popis produktu je příliš krátký pro extrakci (min 30 znaků)',
      }, { status: 400 })
    }

    const facts = await extractFactsFromText(rawText)
    await updateProductFacts(id, facts)
    return NextResponse.json({ ok: true, facts, count: facts.length })
  } catch (err) {
    console.error('[facts POST re-extract]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
