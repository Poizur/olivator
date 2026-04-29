import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { countryName } from '@/lib/utils'
import {
  loadEntityProducts,
  computeProductKpis,
  loadEntityFaqs,
  loadEntityRecipes,
  splitDescriptionToAccordion,
  loadCultivarsByRegion,
  loadBrandsByRegion,
  formatPriceRange,
  formatHarvest,
} from '@/lib/entity-page-data'

import { EntityKpiGrid } from '@/components/entity-page/entity-kpi-grid'
import { EntityCtaStripe } from '@/components/entity-page/entity-cta-stripe'
import { EntityProductsTable } from '@/components/entity-page/entity-products-table'
import { EntityTrustRow } from '@/components/entity-page/entity-trust-row'
import { EntityRelatedContent } from '@/components/entity-page/entity-related-content'
import { EntitySeoAccordion } from '@/components/entity-page/entity-seo-accordion'
import { RegionTerroir } from '@/components/entity-page/region-terroir'
import { FaqJsonLd, PlaceJsonLd } from '@/components/entity-page/entity-jsonld'

export const revalidate = 3600

interface RegionRow {
  id: string
  slug: string
  name: string
  country_code: string
  description_long: string | null
  description_short: string | null
  meta_title: string | null
  meta_description: string | null
  terroir: { climate?: string; soil?: string; tradition?: string } | null
  tldr: string | null
}

async function getRegion(slug: string): Promise<RegionRow | null> {
  const { data } = await supabaseAdmin
    .from('regions')
    .select(
      'id, slug, name, country_code, description_long, description_short, meta_title, meta_description, terroir, tldr'
    )
    .eq('slug', slug)
    .single()
  return (data as RegionRow | null) ?? null
}

interface EntityPhoto {
  url: string
  alt_text: string | null
  source_attribution: string | null
}

async function getEntityPhotos(entityId: string): Promise<EntityPhoto[]> {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('url, alt_text, source_attribution, is_primary, sort_order')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .order('sort_order')
  return (data ?? []) as EntityPhoto[]
}

async function getRegionProductIds(slug: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('region_slug', slug)
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
  return (data ?? []).map((r: { id: string }) => r.id)
}

export async function generateStaticParams() {
  const { data } = await supabaseAdmin.from('regions').select('slug')
  return (data ?? []).map((r: { slug: string }) => ({ slug: r.slug }))
}

const GENITIVE: Record<string, string> = {
  kreta: 'Kréty',
  peloponnes: 'Peloponésu',
  apulie: 'Apulie',
  korfu: 'Korfu',
  zakynthos: 'Zakynthosu',
  toskánsko: 'Toskánska',
  sicilie: 'Sicílie',
  kalabrie: 'Kalábrie',
  andalusie: 'Andalusie',
  lesbos: 'Lesbosu',
  alentejo: 'Alenteja',
  katalansko: 'Katalánska',
  estremadura: 'Estremadury',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const region = await getRegion(slug)
  if (!region) return { title: 'Nenalezeno' }

  const rawTitle = region.meta_title ?? `Olivový olej z ${GENITIVE[slug] ?? region.name}`
  const title = rawTitle.replace(/\s*\|\s*Olivator\s*$/i, '')
  const description =
    region.meta_description ?? `Olivové oleje z regionu ${region.name}. Srovnání, Score a ceny.`
  const url = `https://olivator.cz/oblast/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'cs_CZ', url, siteName: 'Olivator', title, description },
  }
}

export default async function RegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const region = await getRegion(slug)
  if (!region) notFound()

  const [productIds, photos, faqs, recipes] = await Promise.all([
    getRegionProductIds(slug),
    getEntityPhotos(region.id),
    loadEntityFaqs('region', region.id),
    loadEntityRecipes('region', slug),
  ])

  const heroPhoto = photos[0] ?? null
  const products = await loadEntityProducts(productIds)
  const kpis = computeProductKpis(products)

  const country = countryName(region.country_code)
  const titleH1 = `Olivový olej z ${GENITIVE[region.slug] ?? region.name}`

  // Filtry: nabídneme top odrůdy v regionu jako chip filtry tabulky
  const cultivarCounts = new Map<string, number>()
  for (const p of products) {
    if (!p.cultivarLabel) continue
    // cultivarLabel může být "Coratina + Frantoio" — rozdělíme
    for (const c of p.cultivarLabel.split('+').map((s) => s.trim())) {
      cultivarCounts.set(c, (cultivarCounts.get(c) ?? 0) + 1)
    }
  }
  const filterChips = Array.from(cultivarCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ key: label, label, count }))

  // Křížení — odrůdy a značky z tohoto regionu
  const [cultivars, brands] = await Promise.all([
    loadCultivarsByRegion(slug),
    loadBrandsByRegion(slug),
  ])

  const kpiItems = [
    { label: 'Olejů v katalogu', value: String(kpis.count) },
    {
      label: 'Nejvyšší skóre',
      value: kpis.topScore != null ? `${kpis.topScore}/100` : '—',
    },
    { label: 'Sklizeň', value: formatHarvest(kpis.latestHarvest) },
    { label: 'Cenové rozpětí', value: formatPriceRange(kpis.priceRange) },
  ]

  const accordionSections = splitDescriptionToAccordion(region.description_long)
  const tldr = region.tldr ?? region.description_short ?? null

  const url = `https://olivator.cz/oblast/${slug}`

  return (
    <>
      {/* JSON-LD */}
      <PlaceJsonLd
        name={region.name}
        description={tldr ?? `Olivový olej z regionu ${region.name}.`}
        countryName={country}
        url={url}
        imageUrl={heroPhoto?.url ?? null}
      />
      <FaqJsonLd faqs={faqs} />

      <div className="bg-off pb-16">
        {/* Breadcrumb */}
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-6 pb-3">
          <div className="text-xs text-text3">
            <Link href="/" className="text-olive">
              Olivator
            </Link>
            {' › '}
            <span>{region.name}</span>
          </div>
        </div>

        {/* Blok 1 — Hero */}
        <section className="px-6 md:px-10 mb-6">
          <div className="max-w-[1280px] mx-auto">
            {heroPhoto ? (
              <div className="relative rounded-[var(--radius-card)] overflow-hidden h-56 md:h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroPhoto.url}
                  alt={heroPhoto.alt_text ?? region.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-white mb-1">
                    {titleH1}
                  </h1>
                  <p className="text-sm text-white/85">
                    {country} · {kpis.count} olejů v katalogu
                  </p>
                </div>
                {heroPhoto.source_attribution && (
                  <p className="absolute bottom-2 right-3 text-[10px] text-white/50">
                    © {heroPhoto.source_attribution}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 md:p-8">
                <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
                  — {country}
                </div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-2">
                  {titleH1}
                </h1>
                <p className="text-sm text-text3">{kpis.count} olejů v katalogu</p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          {/* Blok 2 — KPI */}
          <EntityKpiGrid items={kpiItems} />

          {/* Blok 3 — CTA */}
          <EntityCtaStripe
            cta={{
              description: `Nevíte, který olej z ${region.name} je pro vás? Quiz vám doporučí za 60 sekund.`,
              label: 'Spustit quiz',
              href: '/quiz',
            }}
          />

          {/* Blok 4 — Tabulka */}
          <EntityProductsTable
            products={products}
            entityType="region"
            filters={filterChips}
            filterField="cultivarLabel"
          />

          {/* Blok 5 — Důvěra */}
          <EntityTrustRow tldr={tldr} entityKind="oblast" />

          {/* Blok 6 — Unique: Terroir */}
          <RegionTerroir
            regionName={region.name}
            countryName={country}
            terroir={region.terroir}
            farmPhotos={photos.slice(1, 5).map((p) => ({ url: p.url, alt: p.alt_text }))}
          />

          {/* Blok 7 — Křížení */}
          <EntityRelatedContent
            recipes={recipes}
            chipSections={[
              {
                title: `Odrůdy z ${region.name}`,
                chips: cultivars.map((c) => ({
                  href: `/odruda/${c.slug}`,
                  label: c.name,
                })),
              },
              {
                title: `Značky z ${region.name}`,
                chips: brands.map((b) => ({
                  href: `/znacka/${b.slug}`,
                  label: b.name,
                })),
              },
            ]}
          />

          {/* Blok 8 — SEO akordeon */}
          <EntitySeoAccordion tldr={tldr} sections={accordionSections} faqs={faqs} />
        </div>
      </div>
    </>
  )
}
