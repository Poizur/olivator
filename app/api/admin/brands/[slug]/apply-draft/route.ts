import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// Aplikuje pending draft z brand_research_drafts do brands row.
// Volá se z admin UI tlačítkem „Schválit a aplikovat" u low-confidence
// výsledků kde autoFillBrand neudělal apply automaticky.
export const dynamic = 'force-dynamic'

interface DraftJson {
  tldr?: string | null
  descriptionShort?: string | null
  descriptionLong?: string | null
  story?: string | null
  philosophy?: string | null
  foundedYear?: number | null
  headquarters?: string | null
  websiteUrl?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  timeline?: Array<{ year: number; label: string }>
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params

  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle()
  if (!brand) return NextResponse.json({ error: 'Brand nenalezen' }, { status: 404 })

  const { data: draftRow } = await supabaseAdmin
    .from('brand_research_drafts')
    .select('draft, candidate_url')
    .eq('brand_id', brand.id)
    .maybeSingle()
  if (!draftRow?.draft) {
    return NextResponse.json({ error: 'Žádný draft k aplikaci' }, { status: 404 })
  }

  const draft = draftRow.draft as DraftJson
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const applied: string[] = []

  const map: Array<[keyof DraftJson, string]> = [
    ['tldr', 'tldr'],
    ['descriptionShort', 'description_short'],
    ['descriptionLong', 'description_long'],
    ['story', 'story'],
    ['philosophy', 'philosophy'],
    ['foundedYear', 'founded_year'],
    ['headquarters', 'headquarters'],
    ['websiteUrl', 'website_url'],
    ['metaTitle', 'meta_title'],
    ['metaDescription', 'meta_description'],
  ]
  for (const [src, dst] of map) {
    const v = draft[src]
    if (v !== null && v !== undefined && v !== '') {
      patch[dst] = v
      applied.push(dst)
    }
  }
  if (Array.isArray(draft.timeline) && draft.timeline.length > 0) {
    patch.timeline = draft.timeline
    applied.push('timeline')
  }

  const { error } = await supabaseAdmin.from('brands').update(patch).eq('id', brand.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('brand_research_drafts')
    .update({ status: 'applied', updated_at: new Date().toISOString() })
    .eq('brand_id', brand.id)

  return NextResponse.json({ ok: true, applied })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { slug } = await params

  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!brand) return NextResponse.json({ error: 'Brand nenalezen' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('brand_research_drafts')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('brand_id', brand.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
