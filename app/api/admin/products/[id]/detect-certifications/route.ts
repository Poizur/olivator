import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { detectCertificationsInText } from '@/lib/cert-detector'

export const maxDuration = 15

/** GET — scan product.raw_description + facts for certification mentions. Returns candidates. */
export async function GET(
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
      .select('raw_description, description_long, description_short, extracted_facts, certifications')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // Scan multiple sources: raw + AI text + fact values (often contain cert mentions)
    const factsText = Array.isArray(product.extracted_facts)
      ? (product.extracted_facts as Array<{ value: string }>)
          .map(f => f.value)
          .filter(Boolean)
          .join(' ')
      : ''
    const combinedText = [
      product.raw_description,
      product.description_long,
      product.description_short,
      factsText,
    ]
      .filter((t): t is string => typeof t === 'string' && t.length > 0)
      .join('\n\n')

    const candidates = detectCertificationsInText(combinedText)
    const alreadyHas: string[] = (product.certifications as string[]) ?? []

    return NextResponse.json({
      ok: true,
      candidates,
      alreadyHas, // so UI can hide certs already in product
    })
  } catch (err) {
    console.error('[detect-certifications]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

/** POST — add confirmed cert to product.certifications array. */
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
    const cert: string | undefined = body?.cert
    if (!cert || typeof cert !== 'string') {
      return NextResponse.json({ error: 'cert je povinná' }, { status: 400 })
    }

    const validCerts = ['dop', 'pgp', 'bio', 'organic', 'nyiooc', 'demeter']
    if (!validCerts.includes(cert)) {
      return NextResponse.json({ error: 'Neplatná certifikace' }, { status: 400 })
    }

    const { data: product } = await supabaseAdmin
      .from('products')
      .select('certifications')
      .eq('id', id)
      .maybeSingle()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const current: string[] = (product.certifications as string[]) ?? []
    if (current.includes(cert)) {
      return NextResponse.json({ ok: true, message: 'Certifikace už existuje', certifications: current })
    }

    const updated = [...current, cert]
    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update({ certifications: updated, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updateErr) throw updateErr

    return NextResponse.json({ ok: true, certifications: updated })
  } catch (err) {
    console.error('[detect-certifications POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
