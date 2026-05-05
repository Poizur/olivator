import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { researchBrand } from '@/lib/brand-research'
import { autoFillBrand } from '@/lib/brand-auto-fill'

// Plný auto-fill (mode='auto'): web search → research → verify → polish CZ → apply.
// Manuální mode (default): admin pošle URL, jen vrátí návrh + uloží logo.
//
// 300 s strop — auto mode dělá 3 Claude calls + scrape + DB upsert.
// Web search bývá 5–15 s, scrape 5–10 s, polish (Sonnet) 10–20 s.
export const maxDuration = 300
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
    const mode = (body?.mode as string | undefined) ?? 'manual'

    if (mode === 'auto') {
      const report = await autoFillBrand(slug)
      return NextResponse.json({ ok: true, mode: 'auto', report })
    }

    // Manual mode — admin zadal URL, jen scrape + návrh + uloží logo
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

    let logoSaved = false
    if (result.logoUrl) {
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
          image_role: 'logo',
        })
        logoSaved = true
      }
    }

    // Manuální mode taky ukládá galerii — admin si ji může vyfiltrovat v UI
    let galleryAdded = 0
    if (result.galleryUrls.length > 0) {
      const { data: existingPhotos } = await supabaseAdmin
        .from('entity_images')
        .select('url')
        .eq('entity_id', brand.id)
      const have = new Set((existingPhotos ?? []).map((r) => (r.url as string).split('?')[0]))
      const rows = result.galleryUrls
        .filter((u) => !have.has(u.split('?')[0]))
        .map((u, i) => ({
          entity_type: 'brand',
          entity_id: brand.id,
          url: u,
          alt_text: `${brand.name} — fotka ${i + 1}`,
          source: 'auto_research',
          source_attribution: `Auto-fetched from ${url}`,
          is_primary: false,
          sort_order: i + 10,
          status: 'active',
          image_role: 'gallery',
        }))
      if (rows.length > 0) {
        const { error } = await supabaseAdmin.from('entity_images').insert(rows)
        if (!error) galleryAdded = rows.length
      }
    }

    return NextResponse.json({ ok: true, mode: 'manual', brand: brand.slug, result, logoSaved, galleryAdded })
  } catch (err) {
    console.error('[admin/brands/auto-research]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
