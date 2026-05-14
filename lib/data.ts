// Data access layer — queries Supabase, same signatures as old mock-data.ts
// All queries run server-side via supabaseAdmin (service key, bypasses RLS)

import { cache } from 'react'
import { supabaseAdmin } from './supabase'
import type { Product, ProductOffer, Retailer } from './types'

// ── Product row mapping (snake_case DB → camelCase TS) ────────────────
interface ProductRow {
  id: string
  ean: string | null
  name: string
  slug: string
  name_short: string | null
  origin_country: string | null
  origin_region: string | null
  type: string | null
  acidity: number | null
  polyphenols: number | null
  oleocanthal: number | null
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
  meta_title: string | null
  meta_description: string | null
  status: string
  status_reason_code: string | null
  status_reason_note: string | null
  status_changed_by: string | null
  status_changed_at: string | null
  image_url: string | null
  image_source: string | null
  extracted_facts: unknown
  source_url: string | null
  raw_description: string | null
  brand_slug: string | null
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    ean: row.ean,                                       // may be null for farm-direct
    name: row.name,
    slug: row.slug,
    nameShort: row.name_short ?? row.name,
    originCountry: row.origin_country ?? '',
    originRegion: row.origin_region ?? '',
    type: (row.type ?? 'evoo') as Product['type'],
    acidity: row.acidity != null ? Number(row.acidity) : null,
    polyphenols: row.polyphenols,                       // preserve null — common for small producers
    oleocanthal: row.oleocanthal != null ? Number(row.oleocanthal) : null,
    peroxideValue: row.peroxide_value != null ? Number(row.peroxide_value) : null,
    oleicAcidPct: row.oleic_acid_pct != null ? Number(row.oleic_acid_pct) : null,
    harvestYear: row.harvest_year,
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
    // null = nedostatek dat / flavored type. UI rozliší a zobrazí "Připravujeme" / "Aroma".
    olivatorScore: row.olivator_score,
    scoreBreakdown: {
      acidity: row.score_breakdown?.acidity ?? 0,
      certifications: row.score_breakdown?.certifications ?? 0,
      quality: row.score_breakdown?.quality ?? 0,
      value: row.score_breakdown?.value ?? 0,
      functionalBonus: row.score_breakdown?.functionalBonus ?? undefined,
    },
    descriptionShort: row.description_short ?? '',
    descriptionLong: row.description_long ?? '',
    metaTitle: row.meta_title ?? null,
    metaDescription: row.meta_description ?? null,
    status: row.status as Product['status'],
    statusReasonCode: row.status_reason_code ?? null,
    statusReasonNote: row.status_reason_note ?? null,
    statusChangedBy: (row.status_changed_by as 'admin' | 'auto' | null) ?? null,
    statusChangedAt: row.status_changed_at ?? null,
    imageUrl: row.image_url ?? null,
    imageSource: row.image_source ?? null,
    extractedFacts: Array.isArray(row.extracted_facts)
      ? (row.extracted_facts as Product['extractedFacts'])
      : [],
    brandSlug: row.brand_slug ?? null,
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
    rating: row.rating != null ? Number(row.rating) : null,
    ratingCount: row.rating_count != null ? Number(row.rating_count) : null,
    ratingSource: (row.rating_source as string) ?? null,
    tagline: (row.tagline as string) ?? null,
    story: (row.story as string) ?? null,
    foundedYear: row.founded_year != null ? Number(row.founded_year) : null,
    founders: (row.founders as string) ?? null,
    headquarters: (row.headquarters as string) ?? null,
    specialization: (row.specialization as string) ?? null,
    logoUrl: (row.logo_url as string) ?? null,
    xmlFeedUrl: (row.xml_feed_url as string) ?? null,
    xmlFeedFormat: (row.xml_feed_format as string) ?? null,
    xmlFeedLastSynced: (row.xml_feed_last_synced as string) ?? null,
    shippingRateCzk: row.shipping_rate_czk != null ? Number(row.shipping_rate_czk) : null,
    freeShippingThresholdCzk: row.free_shipping_threshold_czk != null ? Number(row.free_shipping_threshold_czk) : null,
    deliveryDaysMin: row.delivery_days_min != null ? Number(row.delivery_days_min) : null,
    deliveryDaysMax: row.delivery_days_max != null ? Number(row.delivery_days_max) : null,
    returnDays: row.return_days != null ? Number(row.return_days) : null,
  }
}

// ── Public API ────────────────────────────────────────────────────────

// Pole která public stránky reálně potřebují. Vyloučeno:
//   - raw_description (HTML scrape, 5-50 KB/produkt — admin only)
//   - extracted_facts (admin AI rewrite kontext)
//   - status_reason_* (admin audit, public stránky to nezobrazují)
// Bez toho payload klesne z ~50 KB na ~5 KB per produkt = 10× méně egress.
const PRODUCT_PUBLIC_COLUMNS =
  'id, ean, name, slug, name_short, origin_country, origin_region, type, ' +
  'acidity, polyphenols, oleocanthal, peroxide_value, oleic_acid_pct, ' +
  'harvest_year, processing, flavor_profile, certifications, use_cases, ' +
  'volume_ml, packaging, olivator_score, score_breakdown, ' +
  'description_short, description_long, meta_title, meta_description, ' +
  'status, image_url, image_source, source_url, brand_slug'

// Subset pro listing karty (homepage, srovnavac, sidebar) — bez description_long
// (zobrazuje se pouze na detail stránce). Ušetří ~10-20 KB / produkt × 71.
const PRODUCT_LISTING_COLUMNS =
  'id, ean, name, slug, name_short, origin_country, origin_region, type, ' +
  'acidity, polyphenols, oleocanthal, ' +
  'flavor_profile, certifications, use_cases, ' +
  'volume_ml, olivator_score, image_url, brand_slug'

// Retailer subset pro offers join — vyloučeno: story (long text), xml_feed_*
const RETAILER_PUBLIC_COLUMNS =
  'id, name, slug, domain, affiliate_network, default_commission_pct, ' +
  'is_active, market, rating, rating_count, rating_source, ' +
  'tagline, founders, headquarters, founded_year, specialization, logo_url, ' +
  // Shipping/return data pro Google Merchant Listings rich snippet
  'shipping_rate_czk, free_shipping_threshold_czk, delivery_days_min, delivery_days_max, return_days'

// React `cache()` — memoize per request. Pokud homepage volá Promise.all
// [getProductsWithOffers(), getSiteStats()] paralelně a getSiteStats uvnitř
// taky volá getProductsWithOffers, díky cache() se DB query provede 1×.
/**
 * In-place override `imageUrl` na products array — pokud má produkt v
 * product_images tabulce primary approved obrázek, použije ho místo
 * products.image_url (často low-res XML feed thumbnail).
 *
 * Detail stránka už používá gallery (přes ProductGallery), tahle
 * funkce sjednocuje listing/cards aby uživatel viděl stejnou kvalitu.
 */
async function enrichWithGalleryImages(products: Product[]): Promise<void> {
  if (products.length === 0) return
  const { data } = await supabaseAdmin
    .from('product_images')
    .select('product_id, url')
    .eq('is_primary', true)
    .neq('source', 'scraper_candidate') // jen approved/manual

  if (!data || data.length === 0) return
  const galleryByProduct = new Map<string, string>()
  for (const r of data) {
    galleryByProduct.set(r.product_id as string, r.url as string)
  }
  for (const p of products) {
    const galleryUrl = galleryByProduct.get(p.id)
    if (galleryUrl) p.imageUrl = galleryUrl
  }
}

export const getProducts = cache(async (): Promise<Product[]> => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_PUBLIC_COLUMNS)
    .eq('status', 'active')
    // nullsFirst: false → produkty bez score (flavored / data missing) jdou na konec
    // místo na začátek (Postgres default při DESC dává NULL první).
    .order('olivator_score', { ascending: false, nullsFirst: false })
  if (error) throw error
  const products = (data as unknown as ProductRow[]).map(mapProduct)
  // Override imageUrl s primary obrázkem z product_images gallery (high-res
  // schválený obrázek). Detail stránka používá gallery, listing teď taky —
  // sjednocuje user-visible kvalitu fotek napříč webem.
  await enrichWithGalleryImages(products)
  return products
})

export async function getProductBySlug(slug: string): Promise<Product | null> {
  // Detail page potřebuje extracted_facts pro „Klíčová fakta" sekci.
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_PUBLIC_COLUMNS + ', extracted_facts')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ? mapProduct(data as unknown as ProductRow) : null
}

export async function getProductByOldSlug(oldSlug: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('slug')
    .contains('old_slugs', [oldSlug])
    .maybeSingle()
  return (data as { slug: string } | null)?.slug ?? null
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_PUBLIC_COLUMNS)
    .in('id', ids)
  if (error) throw error
  const products = (data as unknown as ProductRow[]).map(mapProduct)
  await enrichWithGalleryImages(products)
  return products
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_PUBLIC_COLUMNS)
    .in('slug', slugs)
  if (error) throw error
  // Preserve input order
  const bySlug = new Map((data as unknown as ProductRow[]).map(r => [r.slug, mapProduct(r)]))
  const ordered = slugs.map(s => bySlug.get(s)).filter((p): p is Product => !!p)
  await enrichWithGalleryImages(ordered)
  return ordered
}

// Returns all active products with their cheapest offer pre-joined
export const getProductsWithOffers = cache(async (): Promise<Array<Product & { cheapestOffer: ProductOffer | null }>> => {
  const products = await getProducts()
  const ids = products.map(p => p.id)
  if (ids.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('product_offers')
    .select(`id, product_id, retailer_id, price, currency, in_stock, product_url, affiliate_url, commission_pct, retailer:retailers(${RETAILER_PUBLIC_COLUMNS})`)
    .order('price', { ascending: true })
  if (error) throw error

  const productIdSet = new Set(ids)
  const offersByProduct = new Map<string, ProductOffer>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const pid = row.product_id as string
    if (!productIdSet.has(pid)) continue // skip offers for non-active products
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
})

export async function getOffersForProduct(productId: string): Promise<ProductOffer[]> {
  const { data, error } = await supabaseAdmin
    .from('product_offers')
    .select(`id, product_id, retailer_id, price, currency, in_stock, product_url, affiliate_url, commission_pct, retailer:retailers(${RETAILER_PUBLIC_COLUMNS})`)
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
  highPolyphenols: number
  highOleocanthal: number
}

export const getSiteStats = cache(async (): Promise<SiteStats> => {
  const products = await getProductsWithOffers()

  const byOrigin: Record<string, number> = {}
  const byCertification: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let under200Kc = 0
  let highPolyphenols = 0
  let highOleocanthal = 0

  for (const p of products) {
    // Skip null/empty origin — frontend by jinak zobrazil prázdný řádek s číslem
    if (p.originCountry) {
      byOrigin[p.originCountry] = (byOrigin[p.originCountry] ?? 0) + 1
    }
    byType[p.type] = (byType[p.type] ?? 0) + 1
    for (const c of p.certifications) {
      byCertification[c] = (byCertification[c] ?? 0) + 1
    }
    if (p.cheapestOffer && p.cheapestOffer.price <= 200) under200Kc++
    if (p.polyphenols != null && p.polyphenols >= 500) highPolyphenols++
    if (p.oleocanthal != null && p.oleocanthal >= 100) highOleocanthal++
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
    highPolyphenols,
    highOleocanthal,
  }
})

// ── Admin: Retailers ──────────────────────────────────────────────────

export async function getAllRetailers(): Promise<Retailer[]> {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .order('default_commission_pct', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => mapRetailer(r))
}

export async function getRetailerById(id: string): Promise<Retailer | null> {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? mapRetailer(data as Record<string, unknown>) : null
}

// Extended retailer with affiliate template + sync metadata for admin editing
export interface RetailerFull extends Retailer {
  baseTrackingUrl: string | null
  xmlFeedLastResult: Record<string, unknown> | null
}

export async function getRetailerFullById(id: string): Promise<RetailerFull | null> {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    ...mapRetailer(data as Record<string, unknown>),
    baseTrackingUrl: (data.base_tracking_url as string) ?? null,
    xmlFeedLastResult: (data.xml_feed_last_result as Record<string, unknown>) ?? null,
  }
}

export interface RetailerInput {
  name: string
  slug: string
  domain: string
  affiliateNetwork: string
  baseTrackingUrl: string | null
  defaultCommissionPct: number
  isActive: boolean
  market: string
  rating?: number | null
  ratingCount?: number | null
  ratingSource?: string | null
  // Presentation
  tagline?: string | null
  story?: string | null
  foundedYear?: number | null
  founders?: string | null
  headquarters?: string | null
  specialization?: string | null
  logoUrl?: string | null
  // XML feed (volitelné)
  xmlFeedUrl?: string | null
  xmlFeedFormat?: string | null
}

export async function upsertRetailer(input: RetailerInput, id?: string) {
  const payload: Record<string, unknown> = {
    name: input.name,
    slug: input.slug,
    domain: input.domain,
    affiliate_network: input.affiliateNetwork,
    base_tracking_url: input.baseTrackingUrl || null,
    default_commission_pct: input.defaultCommissionPct,
    is_active: input.isActive,
    market: input.market,
  }
  if (input.rating !== undefined) payload.rating = input.rating
  if (input.ratingCount !== undefined) payload.rating_count = input.ratingCount
  if (input.ratingSource !== undefined) payload.rating_source = input.ratingSource
  // Presentation fields
  if (input.tagline !== undefined) payload.tagline = input.tagline || null
  if (input.story !== undefined) payload.story = input.story || null
  if (input.foundedYear !== undefined) payload.founded_year = input.foundedYear
  if (input.founders !== undefined) payload.founders = input.founders || null
  if (input.headquarters !== undefined) payload.headquarters = input.headquarters || null
  if (input.specialization !== undefined) payload.specialization = input.specialization || null
  if (input.logoUrl !== undefined) payload.logo_url = input.logoUrl || null
  if (input.xmlFeedUrl !== undefined) payload.xml_feed_url = input.xmlFeedUrl || null
  if (input.xmlFeedFormat !== undefined) payload.xml_feed_format = input.xmlFeedFormat || null

  if (id) {
    const { error } = await supabaseAdmin.from('retailers').update(payload).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabaseAdmin.from('retailers').insert(payload)
    if (error) throw error
  }
}

export async function deleteRetailer(id: string) {
  const { error } = await supabaseAdmin.from('retailers').delete().eq('id', id)
  if (error) throw error
}

// Public RetailerCard zobrazuje 2 fotky pod logem (sklad / balení / lidé).
// Vrací jen url + alt_text, omezeno na primary + jednu další podle sort_order.
export async function getRetailerPhotosLite(
  retailerId: string,
  limit = 2
): Promise<Array<{ url: string; alt_text: string | null }>> {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('url, alt_text, is_primary, sort_order')
    .eq('entity_id', retailerId)
    .eq('entity_type', 'retailer')
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(limit)
  return (data ?? []).map(r => ({
    url: r.url as string,
    alt_text: (r.alt_text as string) ?? null,
  }))
}

// Count of active offers per retailer — shown in admin list
export async function getRetailerOfferCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('product_offers')
    .select('retailer_id')
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { retailer_id: string }[]) {
    counts[row.retailer_id] = (counts[row.retailer_id] ?? 0) + 1
  }
  return counts
}

// ── Admin: Products ───────────────────────────────────────────────────

export async function getAllProductsAdmin(statusFilter?: string): Promise<Product[]> {
  let query = supabaseAdmin.from('products').select('*')
  if (statusFilter) query = query.eq('status', statusFilter)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return (data as ProductRow[]).map(mapProduct)
}

export interface AdminProductsOptions {
  page?: number
  perPage?: number
  search?: string
  status?: string
  brandSlug?: string
  sort?: string    // 'recent' | 'name' | 'score' | 'acidity' | 'completeness'
  order?: string   // 'asc' | 'desc'
  type?: string
  originCountry?: string
  missing?: string[]   // ['ean','polyphenols','score','acidity','image']
  hasOffers?: string   // 'yes' | 'no'
  scoreMin?: number
  scoreMax?: number
}

export type ProductAdmin = Product & { brandSlug: string | null }

export async function getProductsAdmin(opts: AdminProductsOptions = {}): Promise<{
  products: ProductAdmin[]
  count: number
}> {
  const page = Math.max(1, opts.page ?? 1)
  const perPage = Math.min(250, Math.max(10, opts.perPage ?? 50))
  const search = opts.search?.trim()
  const sort = opts.sort ?? 'recent'
  const orderAsc = opts.order === 'asc'
  const missing = opts.missing ?? []

  // hasOffers: pre-fetch set of product_ids that have at least one offer
  let offerProductIds: string[] | undefined
  if (opts.hasOffers === 'yes' || opts.hasOffers === 'no') {
    const { data } = await supabaseAdmin.from('product_offers').select('product_id')
    offerProductIds = [...new Set((data ?? []).map((r) => r.product_id as string))]
  }

  // Brand-name search: find slugs whose name matches
  let brandSlugsFromSearch: string[] = []
  if (search && !/^\d{8,13}$/.test(search)) {
    const { data } = await supabaseAdmin.from('brands').select('slug').ilike('name', `%${search}%`)
    brandSlugsFromSearch = (data ?? []).map((b) => b.slug as string)
  }

  // Early-exit: hasOffers=yes but no products have offers
  if (opts.hasOffers === 'yes' && offerProductIds?.length === 0) {
    return { products: [], count: 0 }
  }

  let query = supabaseAdmin.from('products').select('*', { count: 'exact' })

  // Text search — EAN exact match OR name ilike (+ brand name match)
  if (search) {
    if (/^\d{8,13}$/.test(search)) {
      query = query.eq('ean', search)
    } else if (brandSlugsFromSearch.length > 0) {
      query = query.or(`name.ilike.%${search}%,brand_slug.in.(${brandSlugsFromSearch.join(',')})`)
    } else {
      query = query.ilike('name', `%${search}%`)
    }
  }

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.brandSlug === '__none__') query = query.is('brand_slug', null)
  else if (opts.brandSlug) query = query.eq('brand_slug', opts.brandSlug)
  if (opts.type) query = query.eq('type', opts.type)
  if (opts.originCountry) query = query.eq('origin_country', opts.originCountry)

  if (missing.includes('ean')) query = query.is('ean', null)
  if (missing.includes('polyphenols')) query = query.is('polyphenols', null)
  if (missing.includes('score')) query = query.is('olivator_score', null)
  if (missing.includes('acidity')) query = query.is('acidity', null)
  if (missing.includes('image')) query = query.is('image_url', null)

  if (opts.scoreMin !== undefined) query = query.gte('olivator_score', opts.scoreMin)
  if (opts.scoreMax !== undefined) query = query.lte('olivator_score', opts.scoreMax)

  if (offerProductIds !== undefined && offerProductIds.length > 0) {
    if (opts.hasOffers === 'yes') query = query.in('id', offerProductIds)
    else query = query.not('id', 'in', `(${offerProductIds.join(',')})`)
  }

  // Sort (completeness is computed — page.tsx handles client-side sort for that case)
  if (sort === 'name') {
    query = query.order('name', { ascending: orderAsc })
  } else if (sort === 'score') {
    query = query.order('olivator_score', { ascending: orderAsc, nullsFirst: false })
  } else if (sort === 'acidity') {
    query = query.order('acidity', { ascending: orderAsc, nullsFirst: false })
  } else {
    // 'recent' (default) and 'completeness' (client-side sort, use recent for DB)
    query = query.order('created_at', { ascending: false })
  }

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error

  const products = (data as unknown as (ProductRow & { brand_slug: string | null })[]).map((row) => ({
    ...mapProduct(row),
    brandSlug: row.brand_slug ?? null,
  }))

  return { products, count: count ?? 0 }
}

export interface ProductInput {
  ean: string | null
  name: string
  slug: string
  nameShort?: string
  originCountry?: string
  originRegion?: string
  type: string
  acidity?: number
  polyphenols?: number
  oleocanthal?: number
  peroxideValue?: number
  oleicAcidPct?: number
  harvestYear?: number
  processing?: string
  flavorProfile?: Record<string, number>
  certifications?: string[]
  useCases?: string[]
  volumeMl?: number
  packaging?: string
  olivatorScore?: number
  scoreBreakdown?: Record<string, number>
  descriptionShort?: string
  descriptionLong?: string
  metaTitle?: string | null
  metaDescription?: string | null
  sourceUrl?: string | null
  rawDescription?: string | null
  status: string
}

export async function createProduct(input: ProductInput): Promise<{ id: string }> {
  const payload = {
    ean: input.ean || null,
    name: input.name,
    slug: input.slug,
    name_short: input.nameShort ?? null,
    origin_country: input.originCountry ?? null,
    origin_region: input.originRegion ?? null,
    type: input.type,
    acidity: input.acidity ?? null,
    polyphenols: input.polyphenols ?? null,
    oleocanthal: input.oleocanthal ?? null,
    peroxide_value: input.peroxideValue ?? null,
    oleic_acid_pct: input.oleicAcidPct ?? null,
    harvest_year: input.harvestYear ?? null,
    processing: input.processing ?? null,
    flavor_profile: input.flavorProfile ?? {},
    certifications: input.certifications ?? [],
    use_cases: input.useCases ?? [],
    volume_ml: input.volumeMl ?? null,
    packaging: input.packaging ?? null,
    olivator_score: input.olivatorScore ?? null,
    score_breakdown: input.scoreBreakdown ?? {},
    description_short: input.descriptionShort ?? null,
    description_long: input.descriptionLong ?? null,
    source_url: input.sourceUrl ?? null,
    raw_description: input.rawDescription ?? null,
    status: input.status,
  }

  // Use slug as conflict resolution (always unique + present).
  // Upserting on ean would fail when ean is null since UNIQUE allows many NULLs.
  const { data, error } = await supabaseAdmin
    .from('products')
    .upsert(payload, { onConflict: 'slug' })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id as string }
}

export async function updateProduct(id: string, input: ProductInput) {
  const payload: Record<string, unknown> = {
    ean: input.ean,
    name: input.name,
    slug: input.slug,
    name_short: input.nameShort ?? null,
    origin_country: input.originCountry ?? null,
    origin_region: input.originRegion ?? null,
    type: input.type,
    acidity: input.acidity ?? null,
    polyphenols: input.polyphenols ?? null,
    oleocanthal: input.oleocanthal ?? null,
    peroxide_value: input.peroxideValue ?? null,
    oleic_acid_pct: input.oleicAcidPct ?? null,
    harvest_year: input.harvestYear ?? null,
    processing: input.processing ?? null,
    flavor_profile: input.flavorProfile ?? {},
    certifications: input.certifications ?? [],
    use_cases: input.useCases ?? [],
    volume_ml: input.volumeMl ?? null,
    packaging: input.packaging ?? null,
    olivator_score: input.olivatorScore ?? null,
    score_breakdown: input.scoreBreakdown ?? {},
    description_short: input.descriptionShort ?? null,
    description_long: input.descriptionLong ?? null,
    status: input.status,
    updated_at: new Date().toISOString(),
  }
  // SEO meta — explicit handling protože pole můžou být prázdná (null) i
  // s úmyslem vymazat custom hodnotu zpět na auto-fallback v generateMetadata.
  if (input.metaTitle !== undefined) payload.meta_title = input.metaTitle
  if (input.metaDescription !== undefined) payload.meta_description = input.metaDescription
  // Only update source_url / raw_description when explicitly provided —
  // admin form doesn't expose them, so omitting keeps existing values.
  if (input.sourceUrl !== undefined) payload.source_url = input.sourceUrl
  if (input.rawDescription !== undefined) payload.raw_description = input.rawDescription
  const { error } = await supabaseAdmin.from('products').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id: string) {
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) throw error
}

// ── Product variants — same brand+region, different volume ────────────

export interface VariantProduct {
  id: string
  slug: string
  name: string
  volumeMl: number | null
  packaging: string | null
  cheapestPrice: number | null
  olivatorScore: number | null
  imageUrl: string | null
  type: string | null
}

/** Strip volume markers + brand prefix z product name aby šly porovnat
 *  varianty stejného oleje. "CORINTO Manaki 0,3% 5 l" → "manaki 0,3"
 *  "CORINTO BIO Manaki 1 l" → "bio manaki". */
function normalizeOilName(name: string, brand: string | null): string {
  let n = name.toLowerCase()
  if (brand) {
    const brandLower = brand.toLowerCase()
    n = n.replace(new RegExp(`\\b${brandLower}\\b`, 'g'), '')
  }
  return n
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\d+\s*[.,]?\d*\s*(?:ml|l|kg|g)\b/gi, '')   // strip volumes "0,3% 5 l"
    .replace(/\b\d+[.,]?\d*\s*%/g, '')                    // strip "% acidity"
    .replace(/\b(?:extra panensky|extra panenský|olivovy|olivový|olej|panenský|panensky)\b/gi, '')
    .replace(/\(|\)/g, ' ')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface VariantGroups {
  /** Identický olej v jiných balíčcích (stejná receptura, jen jiný objem). */
  sameOil: VariantProduct[]
  /** Sibling oleje od stejné značky v stejném regionu, ale jiný produkt. */
  related: VariantProduct[]
  /** Pro UI nadpis — značka (např. "CORINTO") a region ("Peloponés"). */
  brandLabel: string | null
  regionLabel: string | null
}

/** Find sibling products of given product. Vrátí dvě skupiny:
 *  1. sameOil — stejný brand + variety + BIO flag, různý objem
 *  2. related — stejný brand + region, ale jiný produkt
 *  Used on product detail page to show "available in other sizes" + "more from this brand". */
export async function getVariantProducts(productId: string): Promise<VariantGroups> {
  const empty: VariantGroups = { sameOil: [], related: [], brandLabel: null, regionLabel: null }

  const { data: current } = await supabaseAdmin
    .from('products')
    .select('id, name_short, brand_slug, origin_country, origin_region, name, variety, certifications')
    .eq('id', productId)
    .maybeSingle()
  if (!current) return empty

  const brandSlug = current.brand_slug as string | null
  const brandLabel = (current.name_short as string | null) ?? null
  const region = current.origin_region as string | null
  const variety = current.variety as string | null
  const certs = (current.certifications as string[]) ?? []
  const hasBioCert = certs.some(c => c === 'bio' || c === 'organic')
  const currentNameKey = normalizeOilName(current.name as string, brandLabel)

  // Need at least brand_slug or brand label to match
  if (!brandSlug && !brandLabel) return empty

  // Match: same brand_slug PREFERRED (it's canonical), fallback name_short
  let query = supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, brand_slug, volume_ml, packaging, olivator_score, origin_region, image_url, type, variety, certifications')
    .eq('status', 'active')
    .neq('id', productId)
  if (brandSlug) {
    query = query.eq('brand_slug', brandSlug)
  } else if (brandLabel) {
    query = query.eq('name_short', brandLabel)
  }
  const { data: candidates } = await query
  if (!candidates || candidates.length === 0) {
    return { ...empty, brandLabel, regionLabel: region }
  }

  // Stricter: filtruj na stejný region (jinak by Cretamart shop měl 30 oilů)
  const sameRegion = (candidates as Array<Record<string, unknown>>).filter(c => {
    if (!region) return true
    return c.origin_region === region
  })

  // Get cheapest offer per candidate
  const ids = sameRegion.map(c => c.id as string)
  const cheapestByProduct = new Map<string, number>()
  if (ids.length > 0) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, price')
      .in('product_id', ids)
      .order('price', { ascending: true })
    for (const o of offers ?? []) {
      const pid = o.product_id as string
      if (!cheapestByProduct.has(pid)) {
        cheapestByProduct.set(pid, Number(o.price))
      }
    }
  }

  // Klasifikace: same oil vs related
  const sameOil: VariantProduct[] = []
  const related: VariantProduct[] = []

  for (const c of sameRegion) {
    const cVariety = c.variety as string | null
    const cCerts = (c.certifications as string[]) ?? []
    const cHasBio = cCerts.some(x => x === 'bio' || x === 'organic')
    const cName = c.name as string
    const cNameKey = normalizeOilName(cName, brandLabel)

    // Same oil pokud:
    // - stejná varieta (nebo obě null)
    // - stejný BIO status
    // - normalized name match (zachytí varianty s podobným popisem napříč objemy)
    const varietyMatch = (variety ?? '') === (cVariety ?? '')
    const bioMatch = hasBioCert === cHasBio
    const nameMatch = currentNameKey.length > 0 && cNameKey.length > 0 && (
      currentNameKey === cNameKey ||
      currentNameKey.includes(cNameKey) ||
      cNameKey.includes(currentNameKey)
    )

    const variant: VariantProduct = {
      id: c.id as string,
      slug: c.slug as string,
      name: cName,
      volumeMl: c.volume_ml as number | null,
      packaging: c.packaging as string | null,
      cheapestPrice: cheapestByProduct.get(c.id as string) ?? null,
      olivatorScore: c.olivator_score as number | null,
      imageUrl: c.image_url as string | null,
      type: c.type as string | null,
    }

    if (varietyMatch && bioMatch && nameMatch) {
      sameOil.push(variant)
    } else {
      related.push(variant)
    }
  }

  sameOil.sort((a, b) => (a.volumeMl ?? 0) - (b.volumeMl ?? 0))
  related.sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))

  return {
    sameOil,
    related,
    brandLabel,
    regionLabel: region,
  }
}

// ── Editable FAQs ─────────────────────────────────────────────────────

export interface GeneralFAQ {
  id: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  category: string
}

export async function getActiveGeneralFAQs(): Promise<GeneralFAQ[]> {
  const { data, error } = await supabaseAdmin
    .from('general_faqs')
    .select('id, question, answer, sort_order, is_active, category')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) {
    // If table doesn't exist yet (migration not run), gracefully return [].
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw error
  }
  return (data ?? []).map(r => ({
    id: r.id as string,
    question: r.question as string,
    answer: r.answer as string,
    sortOrder: (r.sort_order as number) ?? 0,
    isActive: (r.is_active as boolean) ?? true,
    category: (r.category as string) ?? 'general',
  }))
}

export async function getAllGeneralFAQs(): Promise<GeneralFAQ[]> {
  const { data, error } = await supabaseAdmin
    .from('general_faqs')
    .select('id, question, answer, sort_order, is_active, category')
    .order('sort_order', { ascending: true })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw error
  }
  return (data ?? []).map(r => ({
    id: r.id as string,
    question: r.question as string,
    answer: r.answer as string,
    sortOrder: (r.sort_order as number) ?? 0,
    isActive: (r.is_active as boolean) ?? true,
    category: (r.category as string) ?? 'general',
  }))
}

export async function upsertGeneralFAQ(input: {
  id?: string
  question: string
  answer: string
  sortOrder?: number
  isActive?: boolean
  category?: string
}): Promise<{ id: string }> {
  const payload = {
    question: input.question,
    answer: input.answer,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
    category: input.category ?? 'general',
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { error } = await supabaseAdmin.from('general_faqs').update(payload).eq('id', input.id)
    if (error) throw error
    return { id: input.id }
  } else {
    const { data, error } = await supabaseAdmin
      .from('general_faqs')
      .insert(payload)
      .select('id')
      .single()
    if (error) throw error
    return { id: data!.id as string }
  }
}

export async function deleteGeneralFAQ(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('general_faqs').delete().eq('id', id)
  if (error) throw error
}

export interface CustomFAQ {
  question: string
  answer: string
  source: 'auto' | 'manual'
}

export async function getProductCustomFAQs(productId: string): Promise<CustomFAQ[]> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('custom_faqs')
    .eq('id', productId)
    .maybeSingle()
  if (error) {
    if (error.code === '42703' || error.code === 'PGRST204') return []
    throw error
  }
  const raw = data?.custom_faqs
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is CustomFAQ => typeof r === 'object' && r !== null && typeof (r as CustomFAQ).question === 'string')
    .map(r => ({
      question: r.question,
      answer: r.answer ?? '',
      source: (r as CustomFAQ).source ?? 'manual',
    }))
}

export async function setProductCustomFAQs(productId: string, faqs: CustomFAQ[]): Promise<void> {
  const { error } = await supabaseAdmin
    .from('products')
    .update({ custom_faqs: faqs, updated_at: new Date().toISOString() })
    .eq('id', productId)
  if (error) throw error
}

// ── Gallery images (approved only — for public product pages) ────────

export interface GalleryImage {
  id: string
  url: string
  altText: string | null
  isPrimary: boolean
  sortOrder: number
}

export async function getProductGallery(productId: string): Promise<GalleryImage[]> {
  const { data, error } = await supabaseAdmin
    .from('product_images')
    .select('id, url, alt_text, is_primary, sort_order, source')
    .eq('product_id', productId)
    .neq('source', 'scraper_candidate') // only show approved + manual
    .order('is_primary', { ascending: false }) // primary first
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id as string,
    url: r.url as string,
    altText: (r.alt_text as string) ?? null,
    isPrimary: (r.is_primary as boolean) ?? false,
    sortOrder: (r.sort_order as number) ?? 0,
  }))
}

// ── Rescrape: partial update from scraper (fills only NULL fields + refreshes source) ──

export interface RescrapePatch {
  sourceUrl: string
  rawDescription: string | null
  ean: string | null
  acidity: number | null
  polyphenols: number | null
  peroxideValue: number | null
  oleicAcidPct: number | null
  volumeMl: number | null
  packaging: string | null
  // Lab values + raw parameter table — pushed into products.score_breakdown
  // and extracted_facts as additional metadata (no schema migration needed).
  k232: number | null
  k270: number | null
  deltaK: number | null
  waxMaxMgPerKg: number | null
  parameterTable: Record<string, string>
}

/** Updates only fields that are currently NULL in DB, always refreshes source_url + raw_description. */
export async function applyRescrapePatch(id: string, patch: RescrapePatch): Promise<{ filled: string[] }> {
  const { data: existing, error: readErr } = await supabaseAdmin
    .from('products')
    .select('ean, acidity, polyphenols, peroxide_value, oleic_acid_pct, volume_ml, packaging, score_breakdown, extracted_facts')
    .eq('id', id)
    .maybeSingle()
  if (readErr) throw readErr
  if (!existing) throw new Error('Product not found')

  const filled: string[] = []
  const payload: Record<string, unknown> = {
    source_url: patch.sourceUrl,
    raw_description: patch.rawDescription,
    updated_at: new Date().toISOString(),
  }
  // Only fill NULL/empty fields — never overwrite data the admin set manually
  if ((!existing.ean || existing.ean === '') && patch.ean) {
    payload.ean = patch.ean
    filled.push('EAN')
  }
  if (patch.acidity != null) {
    // Overwrite if NULL, or if scraped value is MORE PRECISE than existing
    // (e.g. DB has 0.3 rounded, scraper reads 0.32 — use 0.32). Tolerance: diff < 0.1 and
    // scraped has more decimal digits.
    const existingAcidity = existing.acidity != null ? Number(existing.acidity) : null
    if (existingAcidity == null) {
      payload.acidity = patch.acidity
      filled.push('kyselost')
    } else {
      const diff = Math.abs(existingAcidity - patch.acidity)
      const scrapedHasMorePrecision = String(patch.acidity).length > String(existingAcidity).length
      if (diff > 0 && diff < 0.1 && scrapedHasMorePrecision) {
        payload.acidity = patch.acidity
        filled.push(`kyselost (${existingAcidity} → ${patch.acidity})`)
      }
    }
  }
  if (existing.polyphenols == null && patch.polyphenols != null) {
    payload.polyphenols = patch.polyphenols
    filled.push('polyfenoly')
  }
  if (existing.peroxide_value == null && patch.peroxideValue != null) {
    payload.peroxide_value = patch.peroxideValue
    filled.push('peroxidové číslo')
  }
  if (existing.volume_ml == null && patch.volumeMl != null) {
    payload.volume_ml = patch.volumeMl
    filled.push('objem')
  }
  if (!existing.packaging && patch.packaging) {
    payload.packaging = patch.packaging
    filled.push('obal')
  }
  if ((existing as { oleic_acid_pct: number | string | null }).oleic_acid_pct == null && patch.oleicAcidPct != null) {
    payload.oleic_acid_pct = patch.oleicAcidPct
    filled.push('kyselina olejová')
  }

  // Lab values that don't have dedicated columns: stash in score_breakdown JSONB
  // alongside score components. Keys: k232, k270, dk, wax_mg_kg.
  // Only fill if missing (preserve admin-set values).
  const existingBreakdown = (existing as { score_breakdown: Record<string, number> | null }).score_breakdown ?? {}
  const labPatch: Record<string, number> = {}
  if (existingBreakdown.k232 == null && patch.k232 != null) labPatch.k232 = patch.k232
  if (existingBreakdown.k270 == null && patch.k270 != null) labPatch.k270 = patch.k270
  if (existingBreakdown.dk == null && patch.deltaK != null) labPatch.dk = patch.deltaK
  if (existingBreakdown.wax_mg_kg == null && patch.waxMaxMgPerKg != null) labPatch.wax_mg_kg = patch.waxMaxMgPerKg
  if (Object.keys(labPatch).length > 0) {
    payload.score_breakdown = { ...existingBreakdown, ...labPatch }
    filled.push(`lab (${Object.keys(labPatch).join(', ')})`)
  }

  // Stash full parameter table in extracted_facts as a single 'parameter_table'
  // entry. Replaces any prior parameter_table entry, keeps other facts intact.
  if (Object.keys(patch.parameterTable).length > 0) {
    const existingFacts = Array.isArray(
      (existing as { extracted_facts: unknown }).extracted_facts
    )
      ? ((existing as { extracted_facts: Array<Record<string, unknown>> }).extracted_facts)
      : []
    const otherFacts = existingFacts.filter((f) => (f as { key: string }).key !== 'parameter_table')
    const tableEntry = {
      key: 'parameter_table',
      label: 'Parametry produktu (zdroj)',
      value: JSON.stringify(patch.parameterTable),
      importance: 'medium',
      source: 'scraped',
    }
    payload.extracted_facts = [...otherFacts, tableEntry]
  }

  const { error } = await supabaseAdmin.from('products').update(payload).eq('id', id)
  if (error) throw error
  return { filled }
}

// ── Extracted facts ──────────────────────────────────────────────────

export async function updateProductFacts(
  id: string,
  facts: Array<{ key: string; label: string; value: string; importance: string; source: string }>
) {
  const { error } = await supabaseAdmin
    .from('products')
    .update({
      extracted_facts: facts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

// ── Admin: Offers ─────────────────────────────────────────────────────

export interface OfferInput {
  productId: string
  retailerId: string
  price: number
  inStock: boolean
  productUrl: string
  affiliateUrl?: string | null
  commissionPct?: number | null
}

export async function upsertOffer(input: OfferInput, id?: string) {
  const payload = {
    product_id: input.productId,
    retailer_id: input.retailerId,
    price: input.price,
    in_stock: input.inStock,
    product_url: input.productUrl || null,
    affiliate_url: input.affiliateUrl || null,
    commission_pct: input.commissionPct ?? null,
    last_checked: new Date().toISOString(),
  }
  if (id) {
    const { error } = await supabaseAdmin.from('product_offers').update(payload).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabaseAdmin
      .from('product_offers')
      .upsert(payload, { onConflict: 'product_id,retailer_id' })
    if (error) throw error
  }
}

export async function deleteOffer(id: string) {
  const { error } = await supabaseAdmin.from('product_offers').delete().eq('id', id)
  if (error) throw error
}

// ── Entity cross-links (region / brand / cultivar) ─────────────────────────

export interface ProductEntityLinks {
  region: { slug: string; name: string; photoUrl: string | null; countryCode: string | null } | null
  brand: { slug: string; name: string; photoUrl: string | null } | null
  cultivars: Array<{ slug: string; name: string; photoUrl: string | null }>
}

export async function getProductEntityLinks(productId: string, brandSlug: string | null, regionSlug: string | null): Promise<ProductEntityLinks> {
  const [regionRow, brandRow, cultivarLinks] = await Promise.all([
    regionSlug
      ? supabaseAdmin.from('regions').select('id, slug, name, country_code').eq('slug', regionSlug).single().then((r) => r.data)
      : Promise.resolve(null),
    brandSlug
      ? supabaseAdmin.from('brands').select('id, slug, name').eq('slug', brandSlug).single().then((r) => r.data)
      : Promise.resolve(null),
    supabaseAdmin
      .from('product_cultivars')
      .select('cultivar_slug')
      .eq('product_id', productId)
      .then((r) => r.data ?? []),
  ])

  const cultivarSlugs = cultivarLinks.map((c: { cultivar_slug: string }) => c.cultivar_slug)
  let cultivars: Array<{ id: string; slug: string; name: string }> = []
  if (cultivarSlugs.length > 0) {
    const { data } = await supabaseAdmin
      .from('cultivars')
      .select('id, slug, name')
      .in('slug', cultivarSlugs)
    cultivars = (data ?? []) as Array<{ id: string; slug: string; name: string }>
  }

  // Načti primární fotky všech tří typů entit jednou batch query.
  // entity_images je polymorphic — entity_type + entity_id.
  const entityIds: Array<{ id: string; type: 'region' | 'brand' | 'cultivar' }> = []
  if (regionRow?.id) entityIds.push({ id: regionRow.id, type: 'region' })
  if (brandRow?.id) entityIds.push({ id: brandRow.id, type: 'brand' })
  for (const c of cultivars) entityIds.push({ id: c.id, type: 'cultivar' })

  const photoByEntity = new Map<string, string>()
  if (entityIds.length > 0) {
    const { data: photos } = await supabaseAdmin
      .from('entity_images')
      .select('entity_id, url')
      .in('entity_id', entityIds.map((e) => e.id))
      .eq('status', 'active')
      .eq('is_primary', true)
    for (const p of photos ?? []) {
      photoByEntity.set(p.entity_id as string, p.url as string)
    }
  }

  return {
    region: regionRow
      ? {
          slug: regionRow.slug,
          name: regionRow.name,
          photoUrl: photoByEntity.get(regionRow.id) ?? null,
          countryCode: regionRow.country_code ?? null,
        }
      : null,
    brand: brandRow
      ? {
          slug: brandRow.slug,
          name: brandRow.name,
          photoUrl: photoByEntity.get(brandRow.id) ?? null,
        }
      : null,
    cultivars: cultivars.map((c) => ({
      slug: c.slug,
      name: c.name,
      photoUrl: photoByEntity.get(c.id) ?? null,
    })),
  }
}

// ── Homepage: regions / brands listing with photos ─────────────────────

export interface RegionTile {
  slug: string
  name: string
  countryCode: string
  productCount: number
  photoUrl: string | null
}

export interface BrandTile {
  slug: string
  name: string
  countryCode: string
  productCount: number
  /** @deprecated alias pro heroUrl ?? logoUrl, kvůli zpětné kompatibilitě */
  photoUrl: string | null
  /** Logo značky — render contain + bílé pozadí. */
  logoUrl: string | null
  /** Atmosférická landscape fotka (zakladatel, výroba) — render cover. */
  heroUrl: string | null
}

export async function getRegionTiles(): Promise<RegionTile[]> {
  // Show all regions that have at least one active product (regardless of region status)
  const [regionsRes, productsRes, photosRes] = await Promise.all([
    supabaseAdmin.from('regions').select('id, slug, name, country_code'),
    supabaseAdmin.from('products').select('region_slug').eq('status', 'active'),
    supabaseAdmin
      .from('entity_images')
      .select('entity_id, url')
      .eq('entity_type', 'region')
      .eq('status', 'active')
      .eq('is_primary', true),
  ])

  const counts: Record<string, number> = {}
  for (const r of productsRes.data ?? []) {
    if (r.region_slug) counts[r.region_slug] = (counts[r.region_slug] ?? 0) + 1
  }
  const photoByEntity = new Map((photosRes.data ?? []).map((p: { entity_id: string; url: string }) => [p.entity_id, p.url]))

  return (regionsRes.data ?? [])
    .map((r: { id: string; slug: string; name: string; country_code: string }) => ({
      slug: r.slug,
      name: r.name,
      countryCode: r.country_code,
      productCount: counts[r.slug] ?? 0,
      photoUrl: photoByEntity.get(r.id) ?? null,
    }))
    .filter((r) => r.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
}

export async function getBrandTiles(): Promise<BrandTile[]> {
  // Načteme všechny brand entity_images a roztřídíme per role.
  // image_role: 'logo' = brand logo, ostatní (gallery/hero/editorial) = hero kandidát
  const [brandsRes, productsRes, imagesRes] = await Promise.all([
    supabaseAdmin.from('brands').select('id, slug, name, country_code'),
    supabaseAdmin.from('products').select('brand_slug').eq('status', 'active'),
    supabaseAdmin
      .from('entity_images')
      .select('entity_id, url, image_role, is_primary, sort_order')
      .eq('entity_type', 'brand')
      .eq('status', 'active')
      .order('sort_order', { ascending: true }),
  ])

  const counts: Record<string, number> = {}
  for (const r of productsRes.data ?? []) {
    if (r.brand_slug) counts[r.brand_slug] = (counts[r.brand_slug] ?? 0) + 1
  }

  const logoByEntity = new Map<string, string>()
  const heroByEntity = new Map<string, string>()
  for (const row of (imagesRes.data ?? []) as Array<{
    entity_id: string
    url: string
    image_role: string | null
    is_primary: boolean | null
  }>) {
    if (row.image_role === 'logo' || (row.is_primary && !logoByEntity.has(row.entity_id) && row.image_role !== 'gallery')) {
      if (!logoByEntity.has(row.entity_id)) logoByEntity.set(row.entity_id, row.url)
    } else if (!heroByEntity.has(row.entity_id)) {
      heroByEntity.set(row.entity_id, row.url)
    }
  }

  return (brandsRes.data ?? [])
    .map((b: { id: string; slug: string; name: string; country_code: string }) => {
      const logoUrl = logoByEntity.get(b.id) ?? null
      const heroUrl = heroByEntity.get(b.id) ?? null
      return {
        slug: b.slug,
        name: b.name,
        countryCode: b.country_code,
        productCount: counts[b.slug] ?? 0,
        photoUrl: heroUrl ?? logoUrl,
        logoUrl,
        heroUrl,
      }
    })
    .filter((b) => b.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
}

// ── 5L bulk products ──────────────────────────────────────────────────
/** Aktivní produkty 4.5–5.5 L s nejlevnější nabídkou, seřazené dle Score. */
export async function get5LProducts(limit = 51): Promise<Array<Product & { cheapestOffer: ProductOffer | null }>> {
  const all = await getProductsWithOffers()
  return all
    .filter(p => p.volumeMl >= 4500 && p.volumeMl <= 5500 && p.cheapestOffer != null)
    .sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))
    .slice(0, limit)
}

// ── Articles, Rankings — still from static data (no CMS yet) ──────────
export { ARTICLES, RANKINGS, getArticles, getArticleBySlug, getRankings, getRankingBySlug } from './static-content'
