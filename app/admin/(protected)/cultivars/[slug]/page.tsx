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

async function getCultivar(slug: string) {
  const { data } = await supabaseAdmin.from('cultivars').select('*').eq('slug', slug).single()
  return data
}

async function getFaqs(entityId: string) {
  const { data } = await supabaseAdmin
    .from('entity_faqs')
    .select('id, question, answer, sort_order')
    .eq('entity_type', 'cultivar')
    .eq('entity_id', entityId)
    .order('sort_order')
  return data ?? []
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

async function getCultivarProductCount(slug: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('product_cultivars')
    .select('*', { count: 'exact', head: true })
    .eq('cultivar_slug', slug)
  return count ?? 0
}

export default async function EditCultivarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cultivar = await getCultivar(slug)
  if (!cultivar) notFound()

  const guideSlugsInDb = ARTICLES.filter((a) => a.category !== 'recept').map((a) => a.slug)

  const [photos, productCount, faqs, allLinkedSlugs] = await Promise.all([
    getEntityPhotos(cultivar.id),
    getCultivarProductCount(slug),
    getFaqs(cultivar.id),
    getLinkedSlugs('cultivar', cultivar.slug),
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
        <Link href="/admin/cultivars" className="text-olive">
          Odrůdy
        </Link>
        {' › '}
        {cultivar.name}
      </div>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          {cultivar.name}
        </h1>
        <p className="text-[12px] text-text3 mt-1">
          {cultivar.slug} · {productCount} produktů · odrůda
        </p>
      </div>

      <div className="space-y-6">
        {/* BLOKY 1, 2, 3, 9 — uvnitř EntityEditForm */}
        <EntityEditForm
          entity={{
            entityType: 'cultivar',
            slug: cultivar.slug,
            name: cultivar.name,
            status: cultivar.status,
            description_long: cultivar.description_long,
            meta_title: cultivar.meta_title,
            meta_description: cultivar.meta_description,
            tldr: cultivar.tldr,
            nickname: cultivar.nickname,
            intensity_score: cultivar.intensity_score,
            primary_use: cultivar.primary_use,
            pairing_pros: cultivar.pairing_pros,
            pairing_cons: cultivar.pairing_cons,
            flavor_profile: cultivar.flavor_profile,
            auto_filled_at: cultivar.auto_filled_at,
          }}
          publicUrl={`/odruda/${cultivar.slug}`}
          entityId={cultivar.id}
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
            entityId={cultivar.id}
            entityType="cultivar"
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
          <EntityFaqEditor entityType="cultivar" entityId={cultivar.id} initialFaqs={faqs} />
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
              entityType="cultivar"
              entitySlug={cultivar.slug}
              allRecipes={allRecipes}
              linkedSlugs={linkedRecipeSlugs}
            />
            <div className="border-t border-off2 pt-6">
              <EntityGuidesLinker
                entityType="cultivar"
                entitySlug={cultivar.slug}
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
          title="Produkty s touto odrůdou"
          publicLocation='Sekce „Olivové oleje s odrůdou X" — tabulka produktů'
          description="Produkty se přiřazují automaticky podle product_cultivars."
        >
          <EntityProductsList entityType="cultivar" entitySlug={cultivar.slug} />
        </AdminBlock>
      </div>
    </div>
  )
}
