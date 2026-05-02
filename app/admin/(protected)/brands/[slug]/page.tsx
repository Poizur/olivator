import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { EntityEditForm } from '@/components/entity-edit-form'
import { EntityFaqEditor } from '@/components/entity-faq-editor'
import { EntityRecipeLinker } from '@/components/entity-recipe-linker'
import { EntityGuidesLinker } from '@/components/entity-guides-linker'
import { EntityPhotosManager } from '@/components/entity-photos-manager'
import { EntityProductsList } from '@/components/entity-products-list'
import { AdminBlock } from '@/components/admin-block'
import { ARTICLES } from '@/lib/static-content'

async function getLinkedSlugs(entityType: 'region' | 'brand' | 'cultivar', entitySlug: string) {
  const { data } = await supabaseAdmin
    .from('recipe_entity_links')
    .select('recipe_slug')
    .eq('entity_type', entityType)
    .eq('entity_slug', entitySlug)
  return (data ?? []).map((d: { recipe_slug: string }) => d.recipe_slug)
}

async function getBrand(slug: string) {
  const { data } = await supabaseAdmin.from('brands').select('*').eq('slug', slug).single()
  return data
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
    .eq('entity_type', 'brand')
    .eq('entity_id', entityId)
    .order('sort_order')
  return data ?? []
}

export default async function EditBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = await getBrand(slug)
  if (!brand) notFound()

  const guideSlugsInDb = ARTICLES.filter((a) => a.category !== 'recept').map((a) => a.slug)

  const [photos, faqs, allLinkedSlugs] = await Promise.all([
    getEntityPhotos(brand.id),
    getFaqs(brand.id),
    getLinkedSlugs('brand', brand.slug),
  ])

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
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">
          Admin
        </Link>
        {' › '}
        <Link href="/admin/brands" className="text-olive">
          Značky
        </Link>
        {' › '}
        {brand.name}
      </div>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          {brand.name}
        </h1>
        <p className="text-[12px] text-text3 mt-1">
          {brand.slug} · {brand.country_code} · značka
        </p>
      </div>

      <div className="space-y-6">
        {/* BLOKY 1, 2, 3, 9 — uvnitř EntityEditForm */}
        <EntityEditForm
          entity={{
            entityType: 'brand',
            slug: brand.slug,
            name: brand.name,
            status: brand.status,
            description_long: brand.description_long,
            meta_title: brand.meta_title,
            meta_description: brand.meta_description,
            tldr: brand.tldr,
            story: brand.story,
            philosophy: brand.philosophy,
            website_url: brand.website_url,
            founded_year: brand.founded_year,
            generation: brand.generation,
            hectares: brand.hectares,
            headquarters: brand.headquarters,
            timeline: brand.timeline,
          }}
          publicUrl={`/znacka/${brand.slug}`}
          entityId={brand.id}
        />

        {/* BLOK 4 — Fotky */}
        <AdminBlock
          number={4}
          icon="🖼️"
          title="Fotky"
          publicLocation="Hero karta · Editorial story · Galerie atmosféra"
          description="Pořadí: 1. fotka = hero, další = editorial sekce, zbytek = galerie."
        >
          <EntityPhotosManager
            entityId={brand.id}
            entityType="brand"
            initialPhotos={photos as Parameters<typeof EntityPhotosManager>[0]['initialPhotos']}
          />
        </AdminBlock>

        {/* BLOK 5 — FAQ */}
        <AdminBlock
          number={5}
          icon="❓"
          title="Časté otázky"
          publicLocation='Sekce „Časté otázky" — sbalený akordeon dole'
          description="Odpovědi na konkrétní dotazy. Slouží i pro Google FAQ rich snippet."
        >
          <EntityFaqEditor entityType="brand" entityId={brand.id} initialFaqs={faqs} />
        </AdminBlock>

        {/* BLOK 6 — Propojení */}
        <AdminBlock
          number={6}
          icon="🔗"
          title="Propojený obsah"
          publicLocation='Sekce „Související obsah" — chips s odkazy'
        >
          <div className="space-y-6">
            <EntityRecipeLinker
              entityType="brand"
              entitySlug={brand.slug}
              allRecipes={allRecipes}
              linkedSlugs={linkedRecipeSlugs}
            />
            <div className="border-t border-off2 pt-6">
              <EntityGuidesLinker
                entityType="brand"
                entitySlug={brand.slug}
                allGuides={allGuides}
                linkedSlugs={linkedGuideSlugs}
              />
            </div>
          </div>
        </AdminBlock>

        {/* BLOK 7 — Produkty */}
        <AdminBlock
          number={7}
          icon="📦"
          title="Produkty značky"
          publicLocation='Sekce „Sortiment" — tabulka produktů'
          description="Produkty se přiřazují automaticky podle pole brand_slug u produktu."
        >
          <EntityProductsList entityType="brand" entitySlug={brand.slug} />
        </AdminBlock>
      </div>
    </div>
  )
}
