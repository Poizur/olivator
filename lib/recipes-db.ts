// DB-backed recipe loader. Public stránky (/recept, /recept/[slug])
// a newsletter pickRecipe() používají tyto funkce.
//
// Fallback na static ARTICLES + ARTICLE_BODIES pokud DB tabulka neexistuje
// nebo je prázdná (graceful degradation pro dev / before migration).

import { supabaseAdmin } from './supabase'

export interface RecipeIngredient {
  name: string
  amount: number | null
  unit: string
  note?: string
}

export interface RecipeInstruction {
  step: string
  duration_min?: number
  note?: string
}

export interface RecipeFull {
  id: string
  slug: string
  title: string
  excerpt: string | null
  emoji: string | null
  readTime: string | null
  heroImageUrl: string | null

  prepTimeMin: number | null
  cookTimeMin: number | null
  servings: number | null
  difficulty: string | null
  cuisine: string | null

  ingredients: RecipeIngredient[]
  instructions: RecipeInstruction[]
  bodyMarkdown: string | null

  recommendedOilTypes: string[]
  recommendedCultivars: string[]
  recommendedRegions: string[]

  metaTitle: string | null
  metaDescription: string | null

  status: string
  source: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RecipeSummary {
  slug: string
  title: string
  excerpt: string | null
  emoji: string | null
  readTime: string | null
  heroImageUrl: string | null
  prepTimeMin: number | null
  servings: number | null
  difficulty: string | null
  cuisine: string | null
  recommendedRegions: string[]
  recommendedCultivars: string[]
  publishedAt: string | null
}

interface Row {
  id: string
  slug: string
  title: string
  excerpt: string | null
  emoji: string | null
  read_time: string | null
  hero_image_url: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number | null
  difficulty: string | null
  cuisine: string | null
  ingredients: RecipeIngredient[] | null
  instructions: RecipeInstruction[] | null
  body_markdown: string | null
  recommended_oil_types: string[] | null
  recommended_cultivars: string[] | null
  recommended_regions: string[] | null
  meta_title: string | null
  meta_description: string | null
  status: string
  source: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

function rowToFull(r: Row): RecipeFull {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    emoji: r.emoji,
    readTime: r.read_time,
    heroImageUrl: r.hero_image_url,
    prepTimeMin: r.prep_time_min,
    cookTimeMin: r.cook_time_min,
    servings: r.servings,
    difficulty: r.difficulty,
    cuisine: r.cuisine,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    instructions: Array.isArray(r.instructions) ? r.instructions : [],
    bodyMarkdown: r.body_markdown,
    recommendedOilTypes: r.recommended_oil_types ?? [],
    recommendedCultivars: r.recommended_cultivars ?? [],
    recommendedRegions: r.recommended_regions ?? [],
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    status: r.status,
    source: r.source,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function rowToSummary(r: Row): RecipeSummary {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    emoji: r.emoji,
    readTime: r.read_time,
    heroImageUrl: r.hero_image_url,
    prepTimeMin: r.prep_time_min,
    servings: r.servings,
    difficulty: r.difficulty,
    cuisine: r.cuisine,
    recommendedRegions: r.recommended_regions ?? [],
    recommendedCultivars: r.recommended_cultivars ?? [],
    publishedAt: r.published_at,
  }
}

/** Načte všechny aktivní recepty pro listing /recept. */
export async function getActiveRecipes(): Promise<RecipeSummary[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('recipes')
      .select(
        'slug, title, excerpt, emoji, read_time, hero_image_url, prep_time_min, servings, difficulty, cuisine, recommended_regions, recommended_cultivars, published_at'
      )
      .eq('status', 'active')
      .order('published_at', { ascending: false, nullsFirst: false })
    if (error) {
      // Tabulka neexistuje (před migrací) → padáme na static
      if (error.code === '42P01' || error.code === 'PGRST205') return []
      throw error
    }
    return (data ?? []).map((r) => rowToSummary(r as Row))
  } catch {
    return []
  }
}

/** Načte všechny recepty (i drafts) pro admin. */
export async function getAllRecipes(): Promise<RecipeFull[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('recipes')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return []
      throw error
    }
    return (data ?? []).map((r) => rowToFull(r as Row))
  } catch {
    return []
  }
}

/** Načte 1 recept podle slugu. */
export async function getRecipeBySlug(slug: string): Promise<RecipeFull | null> {
  try {
    const { data } = await supabaseAdmin
      .from('recipes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return null
    return rowToFull(data as Row)
  } catch {
    return null
  }
}

/** Doporučené recepty pro region/cultivar — newsletter pickRecipe + entity stránky. */
export async function getRecipesForEntity(
  entityType: 'region' | 'cultivar',
  entitySlug: string
): Promise<RecipeSummary[]> {
  try {
    const column = entityType === 'region' ? 'recommended_regions' : 'recommended_cultivars'
    const { data, error } = await supabaseAdmin
      .from('recipes')
      .select(
        'slug, title, excerpt, emoji, read_time, hero_image_url, prep_time_min, servings, difficulty, cuisine, recommended_regions, recommended_cultivars, published_at'
      )
      .eq('status', 'active')
      .contains(column, [entitySlug])
      .order('published_at', { ascending: false, nullsFirst: false })
    if (error) return []
    return (data ?? []).map((r) => rowToSummary(r as Row))
  } catch {
    return []
  }
}
