import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { EntityEditForm } from '@/components/entity-edit-form'
import { GenerateRecipeButton } from '@/components/generate-recipe-button'
import { EntityFaqEditor } from '@/components/entity-faq-editor'
import { EntityRecipeLinker } from '@/components/entity-recipe-linker'
import { EntityGuidesLinker } from '@/components/entity-guides-linker'
import { EntityPhotosManager } from '@/components/entity-photos-manager'
import { EntityProductsList } from '@/components/entity-products-list'
import { AdminBlock } from '@/components/admin-block'
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
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/regions" className="text-olive">Regiony</Link>
        {' › '}
        {region.name}
      </div>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">{region.name}</h1>
        <p className="text-[12px] text-text3 mt-1">
          {region.slug} · {region.country_code} · oblast
        </p>
      </div>

      <div className="space-y-6">
        {/* BLOKY 1, 2, 3, 9 — uvnitř EntityEditForm (TL;DR / Editorial / Specific / SEO) */}
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

        {/* AI Recipe assist — vygeneruje recept k tomuto regionu */}
        <div className="bg-olive-bg/30 border border-olive-border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-[13px] font-semibold text-olive-dark">🍳 AI návrh receptu</h3>
            <p className="text-[12px] text-olive-dark/80 mt-0.5">
              Claude vygeneruje strukturovaný recept (suroviny + postup + tipy) typický pro region {region.name}.
            </p>
          </div>
          <GenerateRecipeButton
            entityType="region"
            slug={region.slug}
            entityName={region.name}
          />
        </div>

        {/* BLOK 4 — Fotky */}
        <AdminBlock
          number={4}
          icon="🖼️"
          title="Fotky"
          publicLocation="Hero karta · Editorial story · Terroir sloupce · Galerie atmosféra"
          description="Pořadí: 1. fotka = hero, 2-N = editorial sekce, další = terroir hlavičky, zbytek = galerie. Pořadí lze upravit ve formuláři níže."
        >
          <EntityPhotosManager
            entityId={region.id}
            entityType="region"
            initialPhotos={photos as Parameters<typeof EntityPhotosManager>[0]['initialPhotos']}
          />
        </AdminBlock>

        {/* BLOK 5 — FAQ */}
        <AdminBlock
          number={5}
          icon="❓"
          title="Časté otázky"
          publicLocation='Sekce „Časté otázky" — sbalený akordeon dole na stránce'
          description="Odpovědi na konkrétní dotazy. Slouží i pro Google FAQ rich snippet (schema.org)."
        >
          <EntityFaqEditor entityType="region" entityId={region.id} initialFaqs={faqs} />
        </AdminBlock>

        {/* BLOK 6 — Propojení (recepty + průvodci) */}
        <AdminBlock
          number={6}
          icon="🔗"
          title="Propojený obsah"
          publicLocation='Sekce „Související obsah" — chips s odkazy'
          description="Co se zobrazí u této oblasti jako související čtení."
        >
          <div className="space-y-6">
            <EntityRecipeLinker
              entityType="region"
              entitySlug={region.slug}
              allRecipes={allRecipes}
              linkedSlugs={linkedRecipeSlugs}
            />
            <div className="border-t border-off2 pt-6">
              <EntityGuidesLinker
                entityType="region"
                entitySlug={region.slug}
                allGuides={allGuides}
                linkedSlugs={linkedGuideSlugs}
              />
            </div>
          </div>
        </AdminBlock>

        {/* BLOK 7 — Produkty (read-only přehled) */}
        <AdminBlock
          number={7}
          icon="📦"
          title="Produkty oblasti"
          publicLocation='Sekce „Olivové oleje z X" — tabulka produktů'
          description="Produkty se přiřazují automaticky podle pole region_slug u produktu."
        >
          <EntityProductsList entityType="region" entitySlug={region.slug} />
        </AdminBlock>
      </div>
    </div>
  )
}
