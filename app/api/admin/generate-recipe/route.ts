// POST /api/admin/generate-recipe
// Body: { entityType: 'region'|'cultivar'|'brand', slug: string, dishHint?: string }
// → AI vygeneruje strukturovaný recept, uloží jako draft do DB.
// Vrací { ok, slug } — admin pak otevře editor.

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRecipe, type RecipeContext } from '@/lib/recipe-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
    const entityType: string = body.entityType
    const slug: string = body.slug
    const dishHint: string | undefined = body.dishHint

    if (!entityType || !slug) {
      return NextResponse.json({ error: 'entityType + slug required' }, { status: 400 })
    }

    // Build context
    const ctx: RecipeContext = {}
    if (entityType === 'region') {
      const { data: r } = await supabaseAdmin
        .from('regions')
        .select('name, slug, country_code')
        .eq('slug', slug)
        .maybeSingle()
      if (!r) return NextResponse.json({ error: 'Region not found' }, { status: 404 })
      ctx.regionName = r.name
      ctx.regionSlug = r.slug
      ctx.cuisineHint =
        r.country_code === 'IT' ? 'italian'
        : r.country_code === 'GR' ? 'greek'
        : r.country_code === 'ES' ? 'spanish'
        : 'mediterranean'
    } else if (entityType === 'cultivar') {
      const { data: c } = await supabaseAdmin
        .from('cultivars')
        .select('name, slug')
        .eq('slug', slug)
        .maybeSingle()
      if (!c) return NextResponse.json({ error: 'Cultivar not found' }, { status: 404 })
      ctx.cultivarName = c.name
      ctx.cultivarSlug = c.slug
    } else if (entityType === 'brand') {
      const { data: b } = await supabaseAdmin
        .from('brands')
        .select('name, slug')
        .eq('slug', slug)
        .maybeSingle()
      if (!b) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      ctx.brandName = b.name
      ctx.brandSlug = b.slug
    } else {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    if (dishHint) ctx.dishHint = dishHint

    // Generate
    const recipe = await generateRecipe(ctx)

    // Save jako draft do DB
    let recipeSlug = slugify(recipe.title)
    const { data: existing } = await supabaseAdmin
      .from('recipes')
      .select('slug')
      .eq('slug', recipeSlug)
      .maybeSingle()
    if (existing) recipeSlug = `${recipeSlug}-${Date.now().toString().slice(-5)}`

    const { error } = await supabaseAdmin.from('recipes').insert({
      slug: recipeSlug,
      title: recipe.title,
      excerpt: recipe.excerpt,
      emoji: recipe.emoji,
      read_time: '5 min čtení',
      cuisine: recipe.cuisine,
      difficulty: recipe.difficulty,
      prep_time_min: recipe.prepTimeMin,
      cook_time_min: recipe.cookTimeMin,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      body_markdown: recipe.bodyMarkdown,
      meta_title: recipe.metaTitle,
      meta_description: recipe.metaDescription,
      recommended_regions: recipe.recommendedRegions,
      recommended_cultivars: recipe.recommendedCultivars,
      status: 'draft',
      source: 'ai_generated',
      ai_generated_at: new Date().toISOString(),
    })

    if (error) throw error

    return NextResponse.json({ ok: true, slug: recipeSlug, title: recipe.title })
  } catch (err) {
    console.error('[generate-recipe]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
