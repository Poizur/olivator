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
  formatPriceRange,
} from '@/lib/entity-page-data'

import { EntityKpiGrid } from '@/components/entity-page/entity-kpi-grid'
import { EntityCtaStripe } from '@/components/entity-page/entity-cta-stripe'
import { EntityProductsTable } from '@/components/entity-page/entity-products-table'
import { EntityTrustRow } from '@/components/entity-page/entity-trust-row'
import { EntityRelatedContent } from '@/components/entity-page/entity-related-content'
import { EntitySeoAccordion } from '@/components/entity-page/entity-seo-accordion'
import { BrandStory } from '@/components/entity-page/brand-story'
import { FaqJsonLd, OrganizationJsonLd } from '@/components/entity-page/entity-jsonld'

export const revalidate = 3600

interface BrandRow {
  id: string
  slug: string
  name: string
  country_code: string
  description_long: string | null
  description_short: string | null
  story: string | null
  philosophy: string | null
  website_url: string | null
  meta_title: string | null
  meta_description: string | null
  founded_year: number | null
  generation: number | null
  hectares: number | null
  headquarters: string | null
  timeline: Array<{ year: number; label: string; description?: string }> | null
  tldr: string | null
}

async function getBrand(slug: string): Promise<BrandRow | null> {
  const { data } = await supabaseAdmin
    .from('brands')
    .select(
      'id, slug, name, country_code, description_long, description_short, story, philosophy, website_url, meta_title, meta_description, founded_year, generation, hectares, headquarters, timeline, tldr'
    )
    .eq('slug', slug)
    .single()
  return (data as BrandRow | null) ?? null
}

async function getEntityPhotos(entityId: string) {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('url, alt_text, source_attribution')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .order('sort_order')
  return (data ?? []) as Array<{
    url: string
    alt_text: string | null
    source_attribution: string | null
  }>
}

async function getBrandProductIds(slug: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('brand_slug', slug)
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
  return (data ?? []).map((r: { id: string }) => r.id)
}

export async function generateStaticParams() {
  const { data } = await supabaseAdmin.from('brands').select('slug')
  return (data ?? []).map((r: { slug: string }) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const brand = await getBrand(slug)
  if (!brand) return { title: 'Nenalezeno' }

  const rawTitle = brand.meta_title ?? `${brand.name} — olivový olej`
  const title = rawTitle.replace(/\s*\|\s*Olivator\s*$/i, '')
  const description =
    brand.meta_description ?? `${brand.name}: srovnání produktů, Olivator Score a nejlepší ceny.`
  const url = `https://olivator.cz/znacka/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'cs_CZ', url, siteName: 'Olivator', title, description },
  }
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = await getBrand(slug)
  if (!brand) notFound()

  const [productIds, photos, faqs, recipes] = await Promise.all([
    getBrandProductIds(slug),
    getEntityPhotos(brand.id),
    loadEntityFaqs('brand', brand.id),
    loadEntityRecipes('brand', slug),
  ])

  const heroPhoto = photos[0] ?? null
  const products = await loadEntityProducts(productIds)
  const kpis = computeProductKpis(products)
  const country = countryName(brand.country_code)

  // Pro značku: filtr podle typu (evoo/blend/...)
  const typeCounts = new Map<string, number>()
  for (const p of products) {
    if (!p.type) continue
    typeCounts.set(p.type, (typeCounts.get(p.type) ?? 0) + 1)
  }
  const typeLabel: Record<string, string> = {
    evoo: 'EVOO',
    virgin: 'Virgin',
    refined: 'Rafinovaný',
    olive_oil: 'Olej',
    pomace: 'Pokrutinový',
  }
  const filterChips = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ key: type, label: typeLabel[type] ?? type, count }))

  // Portfolio rozklad pro BrandStory
  const monovariety = products.filter(
    (p) => p.cultivarLabel && !p.cultivarLabel.includes('+')
  ).length
  const blends = products.filter(
    (p) => p.cultivarLabel && p.cultivarLabel.includes('+')
  ).length
  const flavored = products.filter((p) => p.type !== 'evoo' && p.type !== 'virgin').length
  const portfolio = [
    { label: 'Monovarietály', count: monovariety, hint: 'Z jediné odrůdy' },
    { label: 'Blendy', count: blends, hint: 'Více odrůd v jednom oleji' },
    { label: 'Speciality', count: flavored, hint: 'Ostatní typy' },
  ]

  // Cultivar chip linky (odrůdy ve značce)
  const { data: brandCultivarLinks } = await supabaseAdmin
    .from('product_cultivars')
    .select('cultivar_slug, cultivars!inner(name, slug), products!inner(brand_slug)')
    .eq('products.brand_slug', slug)
    .limit(50)
  const cultivarMap = new Map<string, { slug: string; name: string }>()
  for (const row of (brandCultivarLinks ?? []) as unknown as Array<{
    cultivars: { slug: string; name: string } | { slug: string; name: string }[] | null
  }>) {
    const c = Array.isArray(row.cultivars) ? row.cultivars[0] : row.cultivars
    if (c) cultivarMap.set(c.slug, c)
  }

  const kpiItems = [
    { label: 'Olejů v katalogu', value: String(kpis.count) },
    {
      label: 'Průměrné skóre',
      value: kpis.avgScore != null ? `${kpis.avgScore}/100` : '—',
    },
    {
      label: brand.hectares ? 'Hektary' : 'Cenové rozpětí',
      value: brand.hectares ? `${brand.hectares} ha` : formatPriceRange(kpis.priceRange),
    },
    {
      label: 'Pěstuje od',
      value: brand.founded_year ? String(brand.founded_year) : '—',
      hint: brand.generation ? `${brand.generation}. generace` : undefined,
    },
  ]

  const accordionSections = splitDescriptionToAccordion(brand.description_long)
  const tldr = brand.tldr ?? brand.description_short ?? null
  const url = `https://olivator.cz/znacka/${slug}`

  return (
    <>
      <OrganizationJsonLd
        name={brand.name}
        description={tldr ?? `${brand.name} — olivový olej.`}
        url={url}
        websiteUrl={brand.website_url}
        foundedYear={brand.founded_year}
        countryName={country}
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
            <Link href="/srovnavac" className="text-olive">
              Srovnávač
            </Link>
            {' › '}
            <span>{brand.name}</span>
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
                  alt={heroPhoto.alt_text ?? brand.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-white mb-1">
                    {brand.name}
                  </h1>
                  <p className="text-sm text-white/85">
                    {[
                      brand.headquarters ?? country,
                      brand.founded_year ? `od ${brand.founded_year}` : null,
                      brand.generation ? `${brand.generation}. generace` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 md:p-8">
                <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
                  — {country}
                </div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-2">
                  {brand.name}
                </h1>
                <p className="text-sm text-text3">{kpis.count} olejů v katalogu</p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <EntityKpiGrid items={kpiItems} />

          <EntityCtaStripe
            cta={{
              description: `Chcete vidět všechny oleje od ${brand.name} v jednom srovnání?`,
              label: 'Filtrovat katalog',
              href: `/srovnavac?brand=${slug}`,
            }}
          />

          <EntityProductsTable
            products={products}
            entityType="brand"
            filters={filterChips}
            filterField="type"
          />

          <EntityTrustRow tldr={tldr} entityKind="značka" />

          <BrandStory
            brandName={brand.name}
            timeline={brand.timeline ?? []}
            portfolio={portfolio}
          />

          <EntityRelatedContent
            recipes={recipes}
            chipSections={[
              {
                title: 'Země',
                chips: brand.country_code
                  ? [{ href: `/srovnavac?origin=${brand.country_code.toLowerCase()}`, label: country }]
                  : [],
              },
              {
                title: 'Odrůdy ze sortimentu',
                chips: Array.from(cultivarMap.values()).map((c) => ({
                  href: `/odruda/${c.slug}`,
                  label: c.name,
                })),
              },
            ]}
          />

          <EntitySeoAccordion tldr={tldr} sections={accordionSections} faqs={faqs} />
        </div>
      </div>
    </>
  )
}
