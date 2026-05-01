import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { EntityEditForm } from '@/components/entity-edit-form'
import { EntityFaqEditor } from '@/components/entity-faq-editor'
import { EntityRecipeLinker } from '@/components/entity-recipe-linker'
import { EntityGuidesLinker } from '@/components/entity-guides-linker'
import { EntityPhotosManager } from '@/components/entity-photos-manager'
import { EntityProductsList } from '@/components/entity-products-list'
import { ARTICLES } from '@/lib/static-content'

async function getRegion(slug: string) {
  const { data } = await supabaseAdmin.from('regions').select('*').eq('slug', slug).single()
  return data
}

async function getLinkedSlugs(entityType: 'region' | 'brand' | 'cultivar', entitySlug: string) {
  const { data } = await supabaseAdmin
    .from('recipe_entity_links')
    .select('recipe_slug')
    .eq('entity_type', entityType)
    .eq('entity_slug', entitySlug)
  return (data ?? []).map((d: { recipe_slug: string }) => d.recipe_slug)
}

async function getEntityPhotos(entityId: string) {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('id, url, alt_text, is_primary, sort_order, source, source_attribution, width, height')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .order('sort_order')
  return data ?? []
}

async function getFaqs(entityId: string) {
  const { data } = await supabaseAdmin
    .from('entity_faqs')
    .select('id, question, answer, sort_order')
    .eq('entity_type', 'region')
    .eq('entity_id', entityId)
    .order('sort_order')
  return data ?? []
}

export default async function EditRegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const region = await getRegion(slug)
  if (!region) notFound()

  const guideSlugsInDb = ARTICLES
    .filter((a) => a.category !== 'recept')
    .map((a) => a.slug)

  const [photos, faqs, allLinkedSlugs] = await Promise.all([
    getEntityPhotos(region.id),
    getFaqs(region.id),
    getLinkedSlugs('region', region.slug),
  ])

  // Split linked slugs into recipes vs guides by checking which category they belong to
  const recipeSlugsSet = new Set(ARTICLES.filter((a) => a.category === 'recept').map((a) => a.slug))
  const guideSlugsSet = new Set(guideSlugsInDb)
  const linkedRecipeSlugs = allLinkedSlugs.filter((s) => recipeSlugsSet.has(s))
  const linkedGuideSlugs = allLinkedSlugs.filter((s) => guideSlugsSet.has(s))

  const allRecipes = ARTICLES.filter((a) => a.category === 'recept').map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
  }))

  const allGuides = ARTICLES.filter((a) => a.category !== 'recept').map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
  }))

  return (
    <div className="p-8 max-w-3xl">
      <div className="text-xs text-text3 mb-6">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/regions" className="text-olive">Regiony</Link>
        {' › '}
        {region.name}
      </div>

      <h1 className="text-2xl font-semibold text-text mb-2">{region.name}</h1>
      <p className="text-sm text-text3 mb-8">{region.slug} · {region.country_code}</p>

      <EntityEditForm
        entity={{
          entityType: 'region',
          slug: region.slug,
          name: region.name,
          status: region.status,
          description_long: region.description_long,
          meta_title: region.meta_title,
          meta_description: region.meta_description,
          tldr: region.tldr,
          terroir: region.terroir,
        }}
        publicUrl={`/oblast/${region.slug}`}
        entityId={region.id}
      />

      <EntityPhotosManager
        entityId={region.id}
        entityType="region"
        initialPhotos={photos as Parameters<typeof EntityPhotosManager>[0]['initialPhotos']}
      />

      <EntityFaqEditor
        entityType="region"
        entityId={region.id}
        initialFaqs={faqs}
      />

      <EntityRecipeLinker
        entityType="region"
        entitySlug={region.slug}
        allRecipes={allRecipes}
        linkedSlugs={linkedRecipeSlugs}
      />

      <EntityGuidesLinker
        entityType="region"
        entitySlug={region.slug}
        allGuides={allGuides}
        linkedSlugs={linkedGuideSlugs}
      />

      <EntityProductsList
        entityType="region"
        entitySlug={region.slug}
      />
    </div>
  )
}
