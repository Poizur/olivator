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
 * Načte produkty pro entitu + cheapestOffer + linky na odrůdy.
 * Vrací data pro EntityProductsTable.
 */
export async function loadEntityProducts(productIds: string[]): Promise<ProductTableRow[]> {
  if (productIds.length === 0) return []

  const products = await getProductsByIds(productIds)

  // Cheapest offers paralelně
  const offers = await Promise.all(products.map((p) => getCheapestOffer(p.id)))

  // Cultivar linky pro tyto produkty
  const { data: cultivarLinks } = await supabaseAdmin
    .from('product_cultivars')
    .select('product_id, cultivar_slug, cultivars!inner(name)')
    .in('product_id', products.map((p) => p.id))

  const cultivarsByProduct = new Map<string, string[]>()
  for (const link of (cultivarLinks ?? []) as unknown as Array<{
    product_id: string
    cultivar_slug: string
    cultivars: { name: string } | { name: string }[] | null
  }>) {
    const list = cultivarsByProduct.get(link.product_id) ?? []
    const cultivar = Array.isArray(link.cultivars) ? link.cultivars[0] : link.cultivars
    list.push(cultivar?.name ?? link.cultivar_slug)
    cultivarsByProduct.set(link.product_id, list)
  }

  // Brand + region jména pro lookup
  const brandSlugs = Array.from(
    new Set(
      products
        .map((p) => p.nameShort)  // u nás brand_slug není v Product type — fallback
        .filter(Boolean)
    )
  )

  return products.map((p, i) => {
    const offer = offers[i]
    const cultivars = cultivarsByProduct.get(p.id) ?? []
    return {
      slug: p.slug,
      name: p.name,
      cultivarLabel: cultivars.length > 0 ? cultivars.join(' + ') : null,
      brandSlug: null, // dohodneme v page-level loaderech
      brandName: p.nameShort || null,
      regionSlug: null,
      regionName: p.originRegion || null,
      harvestYear: p.harvestYear,
      olivatorScore: p.olivatorScore,
      acidity: p.acidity,
      polyphenols: p.polyphenols,
      price: offer?.price ?? null,
      pricePer100ml:
        offer?.price && p.volumeMl ? (offer.price / p.volumeMl) * 100 : null,
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
 * První kus před prvním ## se ignoruje (je to úvodní odstavec — ten necháváme
 * v editorial bloku pod heroem).
 */
export function splitDescriptionToAccordion(text: string | null): AccordionSection[] {
  if (!text) return []
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
