import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { researchBrand } from '@/lib/brand-research'

// Admin endpoint — fetch URL výrobce + AI extrakt + uloží do entity_images.
// Vrátí JSON s návrhem dat, admin v UI rozhodne co převzít.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { slug } = await params
    const body = await request.json().catch(() => ({}))
    const url = (body?.url as string | undefined)?.trim()
    if (!url) {
      return NextResponse.json(
        { error: 'Chybí url v body — pošli URL výrobce, např. https://oliointini.it' },
        { status: 400 }
      )
    }

    const { data: brand } = await supabaseAdmin
      .from('brands')
      .select('id, slug, name')
      .eq('slug', slug)
      .maybeSingle()
    if (!brand) {
      return NextResponse.json({ error: 'Brand nenalezen' }, { status: 404 })
    }

    const result = await researchBrand(url)

    // Pokud našli logo, uložit do entity_images jako primary (entity_type='brand').
    let logoSaved = false
    if (result.logoUrl) {
      // Skip pokud už existuje stejné URL pro tento brand
      const { data: existing } = await supabaseAdmin
        .from('entity_images')
        .select('id')
        .eq('entity_id', brand.id)
        .eq('url', result.logoUrl)
        .maybeSingle()

      if (!existing) {
        await supabaseAdmin.from('entity_images').insert({
          entity_type: 'brand',
          entity_id: brand.id,
          url: result.logoUrl,
          alt_text: `${brand.name} logo`,
          source: 'auto_research',
          source_attribution: `Auto-fetched from ${url}`,
          is_primary: true,
          sort_order: 0,
          status: 'active',
        })
        logoSaved = true
      }
    }

    return NextResponse.json({ ok: true, brand: brand.slug, result, logoSaved })
  } catch (err) {
    console.error('[admin/brands/auto-research]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
