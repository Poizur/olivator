// Centralizovaný data loader pro nové entity stránky (oblast/značka/odrůda).
// Sjednocuje:
//   - načtení produktů + cheapestOffer
//   - výpočet KPI a filterChips
//   - načtení FAQ + recipe links
//   - shrnutí editorial textu pro SeoAccordion

import { supabaseAdmin } from '@/lib/supabase'
import { getProductsByIds, getCheapestOffer } from '@/lib/data'
import { countryName } from '@/lib/utils'
import type {
  ProductTableRow,
  KpiItem,
  FaqItem,
  AccordionSection,
  RelatedRecipeCard,
} from '@/components/entity-page/types'

interface CultivarLink {
  product_id: string
  cultivar_slug: string
  cultivar_name: string | null
}

/**
 * Načte produkty pro entitu + cheapestOffer + linky na odrůdy + reálný brand/region/country.
 * Vrací data pro EntityProductsTable.
 *
 * Předtím loader plnil brandName=p.nameShort (display name produktu, ne značky)
 * a regionSlug/originCountry vůbec — filtry v tabulce nefungovaly.
 */
export async function loadEntityProducts(productIds: string[]): Promise<ProductTableRow[]> {
  if (productIds.length === 0) return []

  const products = await getProductsByIds(productIds)
  const ids = products.map((p) => p.id)

  // Cheapest offers paralelně
  const offers = await Promise.all(products.map((p) => getCheapestOffer(p.id)))

  // Cultivar linky pro tyto produkty (s reálnými jmény)
  const cultivarLinksPromise = supabaseAdmin
    .from('product_cultivars')
    .select('product_id, cultivar_slug, cultivars!inner(name)')
    .in('product_id', ids)

  // Skutečný brand/region/country per produkt (NENÍ v Product type)
  const productMetaPromise = supabaseAdmin
    .from('products')
    .select('id, brand_slug, region_slug, origin_country, brands!left(name), regions!left(name)')
    .in('id', ids)

  const [{ data: cultivarLinks }, { data: productMeta }] = await Promise.all([
    cultivarLinksPromise,
    productMetaPromise,
  ])

  const cultivarsByProduct = new Map<string, { names: string[]; slugs: string[] }>()
  for (const link of (cultivarLinks ?? []) as unknown as Array<{
    product_id: string
    cultivar_slug: string
    cultivars: { name: string } | { name: string }[] | null
  }>) {
    const entry = cultivarsByProduct.get(link.product_id) ?? { names: [], slugs: [] }
    const cultivar = Array.isArray(link.cultivars) ? link.cultivars[0] : link.cultivars
    entry.names.push(cultivar?.name ?? link.cultivar_slug)
    entry.slugs.push(link.cultivar_slug)
    cultivarsByProduct.set(link.product_id, entry)
  }

  // Lookup mapa pro brand/region/country
  const metaByProduct = new Map<
    string,
    {
      brandSlug: string | null
      brandName: string | null
      regionSlug: string | null
      regionName: string | null
      originCountry: string | null
    }
  >()
  for (const row of (productMeta ?? []) as unknown as Array<{
    id: string
    brand_slug: string | null
    region_slug: string | null
    origin_country: string | null
    brands: { name: string } | { name: string }[] | null
    regions: { name: string } | { name: string }[] | null
  }>) {
    const brand = Array.isArray(row.brands) ? row.brands[0] : row.brands
    const region = Array.isArray(row.regions) ? row.regions[0] : row.regions
    metaByProduct.set(row.id, {
      brandSlug: row.brand_slug,
      brandName: brand?.name ?? null,
      regionSlug: row.region_slug,
      regionName: region?.name ?? null,
      originCountry: row.origin_country,
    })
  }

  return products.map((p, i) => {
    const offer = offers[i]
    const cultivars = cultivarsByProduct.get(p.id) ?? { names: [], slugs: [] }
    const meta = metaByProduct.get(p.id) ?? {
      brandSlug: null,
      brandName: null,
      regionSlug: null,
      regionName: null,
      originCountry: null,
    }
    // Bezpečný výpočet pricePer100ml: chrání před volumeMl=0 (nedáno) → Infinity
    const pricePer100ml =
      offer?.price && p.volumeMl && p.volumeMl > 0
        ? (offer.price / p.volumeMl) * 100
        : null
    return {
      slug: p.slug,
      name: p.name,
      imageUrl: p.imageUrl ?? null,
      cultivarLabel: cultivars.names.length > 0 ? cultivars.names.join(' + ') : null,
      cultivarSlugs: cultivars.slugs,
      brandSlug: meta.brandSlug,
      brandName: meta.brandName ?? p.nameShort ?? null,
      regionSlug: meta.regionSlug,
      regionName: meta.regionName ?? p.originRegion ?? null,
      originCountry: meta.originCountry ?? p.originCountry ?? null,
      harvestYear: p.harvestYear,
      olivatorScore: p.olivatorScore,
      acidity: p.acidity,
      polyphenols: p.polyphenols,
      price: offer?.price ?? null,
      pricePer100ml,
      retailerName: offer?.retailer.name ?? null,
      type: p.type,
    } satisfies ProductTableRow
  })
}

/**
 * Spočítá společné KPI z produktů.
 */
export function computeProductKpis(rows: ProductTableRow[]): {
  count: number
  topScore: number | null
  avgScore: number | null
  latestHarvest: number | null
  priceRange: { min: number; max: number } | null
  avgPolyphenols: number | null
} {
  const count = rows.length
  if (count === 0) {
    return {
      count: 0,
      topScore: null,
      avgScore: null,
      latestHarvest: null,
      priceRange: null,
      avgPolyphenols: null,
    }
  }
  const scores = rows.map((r) => r.olivatorScore).filter((s): s is number => s != null)
  const harvests = rows.map((r) => r.harvestYear).filter((h): h is number => h != null)
  const prices = rows.map((r) => r.price).filter((p): p is number => p != null)
  const polys = rows.map((r) => r.polyphenols).filter((p): p is number => p != null)

  return {
    count,
    topScore: scores.length > 0 ? Math.max(...scores) : null,
    avgScore:
      scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null,
    latestHarvest: harvests.length > 0 ? Math.max(...harvests) : null,
    priceRange:
      prices.length > 0
        ? { min: Math.min(...prices), max: Math.max(...prices) }
        : null,
    avgPolyphenols:
      polys.length > 0 ? Math.round(polys.reduce((s, v) => s + v, 0) / polys.length) : null,
  }
}

/**
 * Načte FAQ pro entitu seřazené podle sort_order.
 */
export async function loadEntityFaqs(
  entityType: 'region' | 'brand' | 'cultivar',
  entityId: string
): Promise<FaqItem[]> {
  const { data } = await supabaseAdmin
    .from('entity_faqs')
    .select('question, answer')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('sort_order')
  return (data ?? []) as FaqItem[]
}

/**
 * Načte recepty napojené na entitu přes recipe_entity_links.
 * Recepty jsou statické (lib/static-content.ts), tady jen vyhledáme slugy.
 */
export async function loadEntityRecipes(
  entityType: 'region' | 'brand' | 'cultivar',
  entitySlug: string
): Promise<RelatedRecipeCard[]> {
  const { data } = await supabaseAdmin
    .from('recipe_entity_links')
    .select('recipe_slug')
    .eq('entity_type', entityType)
    .eq('entity_slug', entitySlug)

  if (!data || data.length === 0) return []

  const recipeSlugs = data.map((d: { recipe_slug: string }) => d.recipe_slug)
  // Recepty jsou v static-content.ts
  const { ARTICLES } = await import('@/lib/static-content')
  return ARTICLES.filter((a) => recipeSlugs.includes(a.slug)).map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    readTime: a.readTime,
  }))
}

/**
 * Rozsekne dlouhý markdown-light text na sekce podle ## nadpisů.
 * - První kus před prvním ## se v normální cestě ignoruje (je to úvodní
 *   odstavec — ten je v editorial bloku pod heroem).
 * - FALLBACK: pokud text neobsahuje žádné ## nadpisy, vrátíme jednu sekci
 *   "Detail" s celým obsahem, aby se nezavalil entire content do nicoty.
 */
export function splitDescriptionToAccordion(text: string | null): AccordionSection[] {
  if (!text) return []
  const trimmed = text.trim()
  if (!trimmed) return []

  // Žádné H2 nadpisy → jediná sekce s celým obsahem
  if (!trimmed.includes('## ')) {
    return [{ title: 'Detail', body: trimmed }]
  }

  const lines = text.split('\n')
  const sections: AccordionSection[] = []
  let currentTitle: string | null = null
  let currentBody: string[] = []

  const flush = () => {
    if (currentTitle && currentBody.length > 0) {
      sections.push({
        title: currentTitle,
        body: currentBody.join('\n').trim(),
      })
    }
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush()
      currentTitle = line.slice(3).trim()
      currentBody = []
    } else if (currentTitle) {
      currentBody.push(line)
    }
  }
  flush()

  return sections.filter((s) => s.body.length > 0)
}

/**
 * Načte první N "souvisejících" entit druhého typu pro chip linky.
 */
export async function loadCultivarsByRegion(regionSlug: string): Promise<
  Array<{ slug: string; name: string }>
> {
  const { data } = await supabaseAdmin
    .from('product_cultivars')
    .select('cultivar_slug, cultivars!inner(name, slug), products!inner(region_slug)')
    .eq('products.region_slug', regionSlug)
    .limit(50)
  if (!data) return []
  const seen = new Set<string>()
  const result: Array<{ slug: string; name: string }> = []
  for (const row of data as unknown as Array<{
    cultivar_slug: string
    cultivars: { slug: string; name: string } | { slug: string; name: string }[]
  }>) {
    if (seen.has(row.cultivar_slug)) continue
    seen.add(row.cultivar_slug)
    const c = Array.isArray(row.cultivars) ? row.cultivars[0] : row.cultivars
    if (c) result.push({ slug: c.slug, name: c.name })
  }
  return result
}

export async function loadBrandsByRegion(regionSlug: string): Promise<
  Array<{ slug: string; name: string }>
> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('brand_slug, brands!inner(name, slug)')
    .eq('region_slug', regionSlug)
    .not('brand_slug', 'is', null)
    .limit(50)
  if (!data) return []
  const seen = new Set<string>()
  const result: Array<{ slug: string; name: string }> = []
  for (const row of data as unknown as Array<{
    brands: { slug: string; name: string } | { slug: string; name: string }[] | null
  }>) {
    const b = Array.isArray(row.brands) ? row.brands[0] : row.brands
    if (!b || seen.has(b.slug)) continue
    seen.add(b.slug)
    result.push({ slug: b.slug, name: b.name })
  }
  return result
}

/**
 * Polyfenol comparison pro VarietyProfile blok — top 6 odrůd dle průměru
 * polyphenols, plus aktuální odrůda i kdyby nebyla v top 6.
 *
 * Předtím: N+1 query (50 cultivars × 2 dotazy = 100+ roundtripů na render).
 * Teď: 1 dotaz s join + agregace v JS.
 */
export async function loadCultivarPolyphenolStats(currentSlug: string): Promise<
  Array<{
    cultivarSlug: string
    cultivarName: string
    avgPolyphenols: number
    isCurrent: boolean
  }>
> {
  // Jedna query: všechny aktivní produkty + cultivar joinem přes link tabulku
  const { data } = await supabaseAdmin
    .from('product_cultivars')
    .select('cultivar_slug, cultivars!inner(name), products!inner(polyphenols, status)')
    .eq('products.status', 'active')
    .not('products.polyphenols', 'is', null)

  if (!data) return []

  // Agregace v JS — přijatelné pro <2000 produktů, lehčí než RPC
  const accum = new Map<string, { name: string; sum: number; count: number }>()
  for (const row of data as unknown as Array<{
    cultivar_slug: string
    cultivars: { name: string } | { name: string }[] | null
    products: { polyphenols: number | null } | { polyphenols: number | null }[] | null
  }>) {
    const cultivar = Array.isArray(row.cultivars) ? row.cultivars[0] : row.cultivars
    const product = Array.isArray(row.products) ? row.products[0] : row.products
    const poly = product?.polyphenols
    if (!cultivar?.name || typeof poly !== 'number' || poly <= 0) continue
    const entry = accum.get(row.cultivar_slug) ?? { name: cultivar.name, sum: 0, count: 0 }
    entry.sum += poly
    entry.count += 1
    accum.set(row.cultivar_slug, entry)
  }

  const sorted = Array.from(accum.entries())
    .map(([slug, { name, sum, count }]) => ({
      slug,
      name,
      avg: sum / count,
    }))
    .filter((s) => s.avg > 0)
    .sort((a, b) => b.avg - a.avg)

  const top = sorted.slice(0, 6)

  // Pokud aktuální odrůda není v top 6, vlož ji a re-sort dle avg
  if (!top.some((s) => s.slug === currentSlug)) {
    const current = sorted.find((s) => s.slug === currentSlug)
    if (current) {
      top.push(current)
      top.sort((a, b) => b.avg - a.avg)
    }
  }

  return top.map((s) => ({
    cultivarSlug: s.slug,
    cultivarName: s.name,
    avgPolyphenols: s.avg,
    isCurrent: s.slug === currentSlug,
  }))
}

/** Pomocný formátter cenového rozpětí. */
export function formatPriceRange(range: { min: number; max: number } | null): string {
  if (!range) return '—'
  if (range.min === range.max) return `${Math.round(range.min)} Kč`
  return `${Math.round(range.min)}–${Math.round(range.max)} Kč`
}

/** Pomocný formátter sklizně. */
export function formatHarvest(year: number | null): string {
  if (!year) return '—'
  return `${year}/${(year + 1).toString().slice(2)}`
}

export { countryName }
