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
} from '@/lib/entity-page-data'

import { EntityKpiGrid } from '@/components/entity-page/entity-kpi-grid'
import { EntityCtaStripe } from '@/components/entity-page/entity-cta-stripe'
import { EntityProductsTable } from '@/components/entity-page/entity-products-table'
import { EntityTrustRow } from '@/components/entity-page/entity-trust-row'
import { EntityRelatedContent } from '@/components/entity-page/entity-related-content'
import { EntitySeoAccordion } from '@/components/entity-page/entity-seo-accordion'
import { VarietyProfile } from '@/components/entity-page/variety-profile'
import { FaqJsonLd, ArticleJsonLd } from '@/components/entity-page/entity-jsonld'

export const revalidate = 3600

interface CultivarRow {
  id: string
  slug: string
  name: string
  description_long: string | null
  description_short: string | null
  meta_title: string | null
  meta_description: string | null
  flavor_profile: Record<string, number> | null
  intensity_score: number | null
  primary_use: string | null
  pairing_pros: string[] | null
  pairing_cons: string[] | null
  nickname: string | null
  tldr: string | null
  auto_filled_at: string | null
  created_at: string
}

const PRIMARY_USE_LABEL: Record<string, string> = {
  cooking: 'do vaření',
  finishing: 'na dochucení',
  dipping: 'k máčení',
  frying: 'na smažení',
  universal: 'univerzální',
}

async function getCultivar(slug: string): Promise<CultivarRow | null> {
  const { data } = await supabaseAdmin
    .from('cultivars')
    .select(
      'id, slug, name, description_long, description_short, meta_title, meta_description, flavor_profile, intensity_score, primary_use, pairing_pros, pairing_cons, nickname, tldr, auto_filled_at, created_at'
    )
    .eq('slug', slug)
    .single()
  return (data as CultivarRow | null) ?? null
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

async function getCultivarProductIds(slug: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('product_cultivars')
    .select('product_id')
    .eq('cultivar_slug', slug)
  const productIds = (data ?? []).map((r: { product_id: string }) => r.product_id)
  if (productIds.length === 0) return []

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id')
    .in('id', productIds)
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
  return (products ?? []).map((r: { id: string }) => r.id)
}

export async function generateStaticParams() {
  const { data } = await supabaseAdmin.from('cultivars').select('slug')
  return (data ?? []).map((r: { slug: string }) => ({ slug: r.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cultivar = await getCultivar(slug)
  if (!cultivar) return { title: 'Nenalezeno' }

  const rawTitle = cultivar.meta_title ?? `Odrůda ${cultivar.name} — olivový olej`
  const title = rawTitle.replace(/\s*\|\s*Olivator\s*$/i, '')
  const description =
    cultivar.meta_description ??
    `${cultivar.name}: chuťový profil, polyfenoly a nejlepší produkty v ČR.`
  const url = `https://olivator.cz/odruda/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'cs_CZ', url, siteName: 'Olivator', title, description },
  }
}

export default async function CultivarPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cultivar = await getCultivar(slug)
  if (!cultivar) notFound()

  const [productIds, photos, faqs, recipes] = await Promise.all([
    getCultivarProductIds(slug),
    getEntityPhotos(cultivar.id),
    loadEntityFaqs('cultivar', cultivar.id),
    loadEntityRecipes('cultivar', slug),
  ])

  const heroPhoto = photos[0] ?? null
  const products = await loadEntityProducts(productIds)
  const kpis = computeProductKpis(products)

  // Filtry: filtrujeme podle země původu
  const countryCounts = new Map<string, number>()
  // Načteme pro tabulku country info per produkt
  const { data: productCountries } = await supabaseAdmin
    .from('products')
    .select('id, origin_country')
    .in('id', productIds)
  const countryByProduct = new Map<string, string>()
  for (const row of (productCountries ?? []) as Array<{ id: string; origin_country: string | null }>) {
    if (row.origin_country) countryByProduct.set(row.id, row.origin_country)
  }
  // Annotate products s country pro filter
  const productsWithCountry = products.map((p) => {
    // Najdeme původní product id (podle slug)
    return p
  })
  for (const country of countryByProduct.values()) {
    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1)
  }
  const filterChips = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ key: code, label: countryName(code), count }))

  // Polyfenol comparison s ostatními odrůdami — top 5 nejvíc populárních + tahle
  const { data: polyComparisonRaw } = await supabaseAdmin.rpc('cultivar_avg_polyphenols')
    .then(
      (res) => res,
      () => ({ data: null })  // Pokud RPC neexistuje, fallback níže
    )

  let polyphenolComparison: Array<{
    cultivarSlug: string
    cultivarName: string
    avgPolyphenols: number
    isCurrent: boolean
  }> = []

  if (polyComparisonRaw && Array.isArray(polyComparisonRaw)) {
    polyphenolComparison = (polyComparisonRaw as Array<{
      slug: string
      name: string
      avg: number
    }>)
      .filter((r) => r.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6)
      .map((r) => ({
        cultivarSlug: r.slug,
        cultivarName: r.name,
        avgPolyphenols: r.avg,
        isCurrent: r.slug === slug,
      }))
  } else {
    // Fallback: spočítáme manuálně
    const { data: allCultivars } = await supabaseAdmin
      .from('cultivars')
      .select('slug, name')
      .limit(50)

    if (allCultivars) {
      const stats = await Promise.all(
        allCultivars.map(async (c: { slug: string; name: string }) => {
          const { data: links } = await supabaseAdmin
            .from('product_cultivars')
            .select('product_id')
            .eq('cultivar_slug', c.slug)
          const ids = (links ?? []).map((l: { product_id: string }) => l.product_id)
          if (ids.length === 0) return { slug: c.slug, name: c.name, avg: 0 }
          const { data: prods } = await supabaseAdmin
            .from('products')
            .select('polyphenols')
            .in('id', ids)
            .eq('status', 'active')
            .not('polyphenols', 'is', null)
          const polys = (prods ?? [])
            .map((p: { polyphenols: number | null }) => p.polyphenols)
            .filter((v): v is number => v != null)
          if (polys.length === 0) return { slug: c.slug, name: c.name, avg: 0 }
          return {
            slug: c.slug,
            name: c.name,
            avg: polys.reduce((s, v) => s + v, 0) / polys.length,
          }
        })
      )
      polyphenolComparison = stats
        .filter((s) => s.avg > 0)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 6)
        .map((s) => ({
          cultivarSlug: s.slug,
          cultivarName: s.name,
          avgPolyphenols: s.avg,
          isCurrent: s.slug === slug,
        }))

      // Pokud aktuální odrůda není mezi top 6, přidáme ji navíc
      if (!polyphenolComparison.some((p) => p.isCurrent)) {
        const current = stats.find((s) => s.slug === slug)
        if (current && current.avg > 0) {
          polyphenolComparison.push({
            cultivarSlug: current.slug,
            cultivarName: current.name,
            avgPolyphenols: current.avg,
            isCurrent: true,
          })
        }
      }
    }
  }

  // Země pěstování — z products
  const countriesGrown = Array.from(
    new Set(
      Array.from(countryByProduct.values()).map((c) => countryName(c))
    )
  )

  // Křížení — oblasti a značky pěstující odrůdu
  const { data: cultivarRegions } = await supabaseAdmin
    .from('products')
    .select('region_slug, regions!inner(name, slug)')
    .in('id', productIds)
    .not('region_slug', 'is', null)
  const regionMap = new Map<string, { slug: string; name: string }>()
  for (const row of (cultivarRegions ?? []) as unknown as Array<{
    regions: { slug: string; name: string } | { slug: string; name: string }[] | null
  }>) {
    const r = Array.isArray(row.regions) ? row.regions[0] : row.regions
    if (r) regionMap.set(r.slug, r)
  }

  const { data: cultivarBrands } = await supabaseAdmin
    .from('products')
    .select('brand_slug, brands!inner(name, slug)')
    .in('id', productIds)
    .not('brand_slug', 'is', null)
  const brandMap = new Map<string, { slug: string; name: string }>()
  for (const row of (cultivarBrands ?? []) as unknown as Array<{
    brands: { slug: string; name: string } | { slug: string; name: string }[] | null
  }>) {
    const b = Array.isArray(row.brands) ? row.brands[0] : row.brands
    if (b) brandMap.set(b.slug, b)
  }

  const titleH1 = cultivar.name
  const subtitle = [
    cultivar.nickname,
    `${kpis.count} olejů v katalogu`,
  ]
    .filter(Boolean)
    .join(' · ')

  const kpiItems = [
    { label: 'Olejů v katalogu', value: String(kpis.count) },
    {
      label: 'Průměr polyfenolů',
      value: kpis.avgPolyphenols != null ? `${kpis.avgPolyphenols} mg/kg` : '—',
    },
    {
      label: 'Intenzita',
      value: cultivar.intensity_score != null ? `${cultivar.intensity_score}/10` : '—',
    },
    {
      label: 'Typ použití',
      value: cultivar.primary_use ? PRIMARY_USE_LABEL[cultivar.primary_use] ?? cultivar.primary_use : '—',
    },
  ]

  const accordionSections = splitDescriptionToAccordion(cultivar.description_long)
  const tldr = cultivar.tldr ?? cultivar.description_short ?? null
  const url = `https://olivator.cz/odruda/${slug}`

  return (
    <>
      <ArticleJsonLd
        headline={`Odrůda ${cultivar.name}`}
        description={tldr ?? `Odrůda ${cultivar.name}: chuťový profil, polyfenoly a produkty.`}
        url={url}
        datePublished={cultivar.created_at}
        imageUrl={heroPhoto?.url ?? null}
      />
      <FaqJsonLd faqs={faqs} />

      <div className="bg-off pb-16">
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
            <span>Odrůda {cultivar.name}</span>
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
                  alt={heroPhoto.alt_text ?? cultivar.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-white mb-1">
                    {titleH1}
                  </h1>
                  <p className="text-sm text-white/85">{subtitle}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 md:p-8">
                <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
                  — Odrůda
                </div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-2">
                  {titleH1}
                </h1>
                <p className="text-sm text-text3">{subtitle}</p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <EntityKpiGrid items={kpiItems} />

          <EntityCtaStripe
            cta={{
              description: `Chcete najít konkrétní olej s odrůdou ${cultivar.name}? Otevřete srovnávač s tímhle filtrem.`,
              label: 'Filtrovat katalog',
              href: `/srovnavac?cultivar=${slug}`,
            }}
          />

          <EntityProductsTable
            products={products}
            entityType="cultivar"
            filters={filterChips}
            filterField="regionSlug"
          />

          <EntityTrustRow tldr={tldr} entityKind="odrůda" />

          <VarietyProfile
            cultivarName={cultivar.name}
            flavorProfile={cultivar.flavor_profile}
            autoFilledAt={cultivar.auto_filled_at}
            polyphenolComparison={polyphenolComparison}
            pairingPros={cultivar.pairing_pros ?? []}
            pairingCons={cultivar.pairing_cons ?? []}
            countriesGrown={countriesGrown}
          />

          <EntityRelatedContent
            recipes={recipes}
            chipSections={[
              {
                title: 'Oblasti pěstování',
                chips: Array.from(regionMap.values()).map((r) => ({
                  href: `/oblast/${r.slug}`,
                  label: r.name,
                })),
              },
              {
                title: 'Značky vyrábějící odrůdu',
                chips: Array.from(brandMap.values()).map((b) => ({
                  href: `/znacka/${b.slug}`,
                  label: b.name,
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
