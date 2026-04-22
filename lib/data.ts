// Data access layer — queries Supabase, same signatures as old mock-data.ts
// All queries run server-side via supabaseAdmin (service key, bypasses RLS)

import { supabaseAdmin } from './supabase'
import type { Product, ProductOffer, Retailer } from './types'

// ── Product row mapping (snake_case DB → camelCase TS) ────────────────
interface ProductRow {
  id: string
  ean: string
  name: string
  slug: string
  name_short: string | null
  origin_country: string | null
  origin_region: string | null
  type: string | null
  acidity: number | null
  polyphenols: number | null
  peroxide_value: number | null
  oleic_acid_pct: number | null
  harvest_year: number | null
  processing: string | null
  flavor_profile: Record<string, number>
  certifications: string[]
  use_cases: string[]
  volume_ml: number | null
  packaging: string | null
  olivator_score: number | null
  score_breakdown: Record<string, number>
  description_short: string | null
  description_long: string | null
  status: string
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    ean: row.ean,
    name: row.name,
    slug: row.slug,
    nameShort: row.name_short ?? row.name,
    originCountry: row.origin_country ?? '',
    originRegion: row.origin_region ?? '',
    type: (row.type ?? 'evoo') as Product['type'],
    acidity: Number(row.acidity ?? 0),
    polyphenols: row.polyphenols ?? 0,
    peroxideValue: Number(row.peroxide_value ?? 0),
    oleicAcidPct: Number(row.oleic_acid_pct ?? 0),
    harvestYear: row.harvest_year ?? new Date().getFullYear(),
    processing: row.processing ?? '',
    flavorProfile: {
      fruity: row.flavor_profile?.fruity ?? 0,
      herbal: row.flavor_profile?.herbal ?? 0,
      bitter: row.flavor_profile?.bitter ?? 0,
      spicy: row.flavor_profile?.spicy ?? 0,
      mild: row.flavor_profile?.mild ?? 0,
      nutty: row.flavor_profile?.nutty ?? 0,
      buttery: row.flavor_profile?.buttery ?? 0,
    },
    certifications: row.certifications ?? [],
    useCases: row.use_cases ?? [],
    volumeMl: row.volume_ml ?? 0,
    packaging: row.packaging ?? '',
    olivatorScore: row.olivator_score ?? 0,
    scoreBreakdown: {
      acidity: row.score_breakdown?.acidity ?? 0,
      certifications: row.score_breakdown?.certifications ?? 0,
      quality: row.score_breakdown?.quality ?? 0,
      value: row.score_breakdown?.value ?? 0,
    },
    descriptionShort: row.description_short ?? '',
    descriptionLong: row.description_long ?? '',
    status: row.status as Product['status'],
  }
}

function mapRetailer(row: Record<string, unknown>): Retailer {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    domain: (row.domain as string) ?? '',
    affiliateNetwork: (row.affiliate_network as string) ?? '',
    defaultCommissionPct: Number(row.default_commission_pct ?? 0),
    isActive: (row.is_active as boolean) ?? true,
    market: (row.market as string) ?? 'CZ',
  }
}

// ── Public API ────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
  if (error) throw error
  return (data as ProductRow[]).map(mapProduct)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ? mapProduct(data as ProductRow) : null
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .in('id', ids)
  if (error) throw error
  return (data as ProductRow[]).map(mapProduct)
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .in('slug', slugs)
  if (error) throw error
  // Preserve input order
  const bySlug = new Map((data as ProductRow[]).map(r => [r.slug, mapProduct(r)]))
  return slugs.map(s => bySlug.get(s)).filter((p): p is Product => !!p)
}

// Returns all active products with their cheapest offer pre-joined
export async function getProductsWithOffers(): Promise<Array<Product & { cheapestOffer: ProductOffer | null }>> {
  const products = await getProducts()
  const ids = products.map(p => p.id)
  if (ids.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('product_offers')
    .select('*, retailer:retailers(*)')
    .in('product_id', ids)
    .order('price', { ascending: true })
  if (error) throw error

  const offersByProduct = new Map<string, ProductOffer>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const pid = row.product_id as string
    if (offersByProduct.has(pid)) continue // already have cheapest
    offersByProduct.set(pid, {
      id: row.id as string,
      productId: pid,
      retailerId: row.retailer_id as string,
      retailer: mapRetailer(row.retailer as Record<string, unknown>),
      price: Number(row.price),
      currency: (row.currency as string) ?? 'CZK',
      inStock: (row.in_stock as boolean) ?? true,
      productUrl: (row.product_url as string) ?? '',
      affiliateUrl: (row.affiliate_url as string) ?? '',
      commissionPct: Number(row.commission_pct ?? 0),
    })
  }

  return products.map(p => ({ ...p, cheapestOffer: offersByProduct.get(p.id) ?? null }))
}

export async function getOffersForProduct(productId: string): Promise<ProductOffer[]> {
  const { data, error } = await supabaseAdmin
    .from('product_offers')
    .select('*, retailer:retailers(*)')
    .eq('product_id', productId)
    .order('price', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    productId: row.product_id as string,
    retailerId: row.retailer_id as string,
    retailer: mapRetailer(row.retailer as Record<string, unknown>),
    price: Number(row.price),
    currency: (row.currency as string) ?? 'CZK',
    inStock: (row.in_stock as boolean) ?? true,
    productUrl: (row.product_url as string) ?? '',
    affiliateUrl: (row.affiliate_url as string) ?? '',
    commissionPct: Number(row.commission_pct ?? 0),
  }))
}

export async function getCheapestOffer(productId: string): Promise<ProductOffer | null> {
  const offers = await getOffersForProduct(productId)
  return offers[0] ?? null
}

// Aggregate stats for homepage and listings
export interface SiteStats {
  totalProducts: number
  activeRetailers: number
  byOrigin: Record<string, number>
  byCertification: Record<string, number>
  byType: Record<string, number>
  under200Kc: number
}

export async function getSiteStats(): Promise<SiteStats> {
  const products = await getProductsWithOffers()

  const byOrigin: Record<string, number> = {}
  const byCertification: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let under200Kc = 0

  for (const p of products) {
    byOrigin[p.originCountry] = (byOrigin[p.originCountry] ?? 0) + 1
    byType[p.type] = (byType[p.type] ?? 0) + 1
    for (const c of p.certifications) {
      byCertification[c] = (byCertification[c] ?? 0) + 1
    }
    if (p.cheapestOffer && p.cheapestOffer.price <= 200) under200Kc++
  }

  const { count } = await supabaseAdmin
    .from('retailers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  return {
    totalProducts: products.length,
    activeRetailers: count ?? 0,
    byOrigin,
    byCertification,
    byType,
    under200Kc,
  }
}

// ── Articles, Rankings — still from static data (no CMS yet) ──────────
export { ARTICLES, RANKINGS, getArticles, getArticleBySlug, getRankings, getRankingBySlug } from './static-content'
