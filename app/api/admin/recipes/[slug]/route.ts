// PATCH /api/admin/recipes/[slug] — update recept
// DELETE — smazat recept (hard delete)

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_FIELDS = [
  'title', 'excerpt', 'emoji', 'read_time', 'hero_image_url',
  'prep_time_min', 'cook_time_min', 'servings', 'difficulty', 'cuisine',
  'ingredients', 'instructions', 'body_markdown',
  'recommended_oil_types', 'recommended_cultivars', 'recommended_regions',
  'meta_title', 'meta_description', 'status',
]

const SNAKE_TO_CAMEL: Record<string, string> = {
  readTime: 'read_time',
  heroImageUrl: 'hero_image_url',
  prepTimeMin: 'prep_time_min',
  cookTimeMin: 'cook_time_min',
  bodyMarkdown: 'body_markdown',
  recommendedOilTypes: 'recommended_oil_types',
  recommendedCultivars: 'recommended_cultivars',
  recommendedRegions: 'recommended_regions',
  metaTitle: 'meta_title',
  metaDescription: 'meta_description',
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { slug } = await params
    const body = await request.json()

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const [key, value] of Object.entries(body)) {
      const dbKey = SNAKE_TO_CAMEL[key] ?? key
      if (ALLOWED_FIELDS.includes(dbKey)) {
        payload[dbKey] = value
      }
    }

    // Pokud měníme status na 'active' a published_at je null, nastav teď
    if (payload.status === 'active') {
      const { data: existing } = await supabaseAdmin
        .from('recipes')
        .select('published_at')
        .eq('slug', slug)
        .maybeSingle()
      if (existing && !existing.published_at) {
        payload.published_at = new Date().toISOString()
      }
    }

    if (Object.keys(payload).length === 1) {
      return NextResponse.json({ error: 'Nic k aktualizaci' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('recipes')
      .update(payload)
      .eq('slug', slug)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { slug } = await params
    const { error } = await supabaseAdmin.from('recipes').delete().eq('slug', slug)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
