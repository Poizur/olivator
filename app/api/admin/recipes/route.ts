// POST /api/admin/recipes — vytvoří nový draft recept (jen title + auto-slug)
// GET — list všech receptů (admin)

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const title = String(body.title ?? '').trim()
    if (!title) {
      return NextResponse.json({ error: 'Title je povinný' }, { status: 400 })
    }

    let slug = String(body.slug ?? slugify(title))
    if (!slug) slug = slugify(title)

    // Pokud slug existuje, přidej suffix
    const { data: existing } = await supabaseAdmin
      .from('recipes')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-5)}`
    }

    const { data, error } = await supabaseAdmin
      .from('recipes')
      .insert({
        slug,
        title,
        excerpt: body.excerpt ?? null,
        emoji: body.emoji ?? '🍽',
        read_time: body.readTime ?? '5 min čtení',
        ingredients: body.ingredients ?? [],
        instructions: body.instructions ?? [],
        body_markdown: body.bodyMarkdown ?? null,
        recommended_regions: body.recommendedRegions ?? [],
        recommended_cultivars: body.recommendedCultivars ?? [],
        cuisine: body.cuisine ?? null,
        difficulty: body.difficulty ?? null,
        prep_time_min: body.prepTimeMin ?? null,
        cook_time_min: body.cookTimeMin ?? null,
        servings: body.servings ?? null,
        status: body.status ?? 'draft',
        source: body.source ?? 'manual',
      })
      .select('slug')
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, slug: data.slug })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
