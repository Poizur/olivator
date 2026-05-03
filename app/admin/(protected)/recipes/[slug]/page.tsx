// Admin recipe edit page — bloky stejně jako u entit (TL;DR, ingredients,
// instructions, body, pairing, SEO).

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRecipeBySlug } from '@/lib/recipes-db'
import { supabaseAdmin } from '@/lib/supabase'
import { RecipeEditForm } from './recipe-edit-form'

export const dynamic = 'force-dynamic'

async function getRegionSlugs(): Promise<string[]> {
  const { data } = await supabaseAdmin.from('regions').select('slug').order('name')
  return (data ?? []).map((r) => r.slug as string)
}

async function getCultivarSlugs(): Promise<string[]> {
  const { data } = await supabaseAdmin.from('cultivars').select('slug').order('name')
  return (data ?? []).map((c) => c.slug as string)
}

async function getRecipePhotos(recipeId: string) {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('id, url, alt_text, is_primary, sort_order, source, source_attribution, width, height')
    .eq('entity_id', recipeId)
    .eq('entity_type', 'recipe')
    .eq('status', 'active')
    .order('sort_order')
  return data ?? []
}

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  if (!recipe) notFound()

  const [regionSlugs, cultivarSlugs, photos] = await Promise.all([
    getRegionSlugs(),
    getCultivarSlugs(),
    getRecipePhotos(recipe.id),
  ])

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/recipes" className="text-olive">Recepty</Link>
        {' › '}
        {recipe.title}
      </div>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          {recipe.title}
        </h1>
        <p className="text-[12px] text-text3 mt-1">
          {recipe.slug} · {recipe.status}
          {recipe.source === 'ai_generated' && <> · ✨ AI generated</>}
          {recipe.source === 'static_legacy' && <> · legacy migrated</>}
        </p>
      </div>

      <RecipeEditForm
        recipe={recipe}
        availableRegions={regionSlugs}
        availableCultivars={cultivarSlugs}
        initialPhotos={photos}
      />
    </div>
  )
}
