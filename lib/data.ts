// Data access layer — queries Supabase, same signatures as old mock-data.ts
// All queries run server-side via supabaseAdmin (service key, bypasses RLS)

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
  image_url: string | null
  image_source: string | null
  extracted_facts: unknown
  source_url: string | null
  raw_description: string | null
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
    olivatorScore: row.olivator_score ?? 0,
    scoreBreakdown: {
      acidity: row.score_breakdown?.acidity ?? 0,
      certifications: row.score_breakdown?.certifications ?? 0,
      quality: row.score_breakdown?.quality ?? 0,
      value: row.score_breakdown?.value ?? 0,
    },
    descriptionShort: row.description_short ?? '',
    descriptionLong: row.description_long ?? '',
    metaTitle: row.meta_title ?? null,
    metaDescription: row.meta_description ?? null,
    status: row.status as Product['status'],
    imageUrl: row.image_url ?? null,
    imageSource: row.image_source ?? null,
    extractedFacts: Array.isArray(row.extracted_facts)
      ? (row.extracted_facts as Product['extractedFacts'])
      : [],
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
  highPolyphenols: number
  highOleocanthal: number
}

export async function getSiteStats(): Promise<SiteStats> {
  const products = await getProductsWithOffers()

  const byOrigin: Record<string, number> = {}
  const byCertification: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let under200Kc = 0
  let highPolyphenols = 0
  let highOleocanthal = 0

  for (const p of products) {
    byOrigin[p.originCountry] = (byOrigin[p.originCountry] ?? 0) + 1
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
}

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

// Extended retailer with affiliate template for admin editing
export interface RetailerFull extends Retailer {
  baseTrackingUrl: string | null
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
}

/** Find sibling products of given product (same brand + region + base name).
 *  Used on product detail page to show "available in other sizes". */
export async function getVariantProducts(productId: string): Promise<VariantProduct[]> {
  const { data: current } = await supabaseAdmin
    .from('products')
    .select('id, name_short, origin_country, origin_region, name')
    .eq('id', productId)
    .maybeSingle()
  if (!current) return []

  const brand = current.name_short as string | null
  const region = current.origin_region as string | null

  // Need at least brand or country+region to match meaningfully
  if (!brand && !region) return []

  // Match products with same brand. If no brand, fall back to same region.
  let query = supabaseAdmin
    .from('products')
    .select('id, slug, name, volume_ml, packaging, olivator_score, name_short, origin_region, image_url')
    .eq('status', 'active')
    .neq('id', productId)
  if (brand) {
    query = query.eq('name_short', brand)
  } else {
    query = query.eq('origin_region', region as string)
  }
  const { data: candidates } = await query
  if (!candidates || candidates.length === 0) return []

  // Stricter match: same region too (if brand only) — avoid false positives
  // when brand is generic ("Olivar Selection")
  const filtered = candidates.filter(c => {
    if (!brand) return true // already filtered by region
    return c.origin_region === region
  })

  // Get cheapest offer per candidate
  const ids = filtered.map(c => c.id as string)
  if (ids.length === 0) return []
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price')
    .in('product_id', ids)
    .order('price', { ascending: true })
  const cheapestByProduct = new Map<string, number>()
  for (const o of offers ?? []) {
    const pid = o.product_id as string
    if (!cheapestByProduct.has(pid)) {
      cheapestByProduct.set(pid, Number(o.price))
    }
  }

  return filtered
    .map(c => ({
      id: c.id as string,
      slug: c.slug as string,
      name: c.name as string,
      volumeMl: c.volume_ml as number | null,
      packaging: c.packaging as string | null,
      cheapestPrice: cheapestByProduct.get(c.id as string) ?? null,
      olivatorScore: c.olivator_score as number | null,
      imageUrl: c.image_url as string | null,
    }))
    .sort((a, b) => (a.volumeMl ?? 0) - (b.volumeMl ?? 0))
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
  photoUrl: string | null
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
  const [brandsRes, productsRes, photosRes] = await Promise.all([
    supabaseAdmin.from('brands').select('id, slug, name, country_code'),
    supabaseAdmin.from('products').select('brand_slug').eq('status', 'active'),
    supabaseAdmin
      .from('entity_images')
      .select('entity_id, url')
      .eq('entity_type', 'brand')
      .eq('status', 'active')
      .eq('is_primary', true),
  ])

  const counts: Record<string, number> = {}
  for (const r of productsRes.data ?? []) {
    if (r.brand_slug) counts[r.brand_slug] = (counts[r.brand_slug] ?? 0) + 1
  }
  const photoByEntity = new Map((photosRes.data ?? []).map((p: { entity_id: string; url: string }) => [p.entity_id, p.url]))

  return (brandsRes.data ?? [])
    .map((b: { id: string; slug: string; name: string; country_code: string }) => ({
      slug: b.slug,
      name: b.name,
      countryCode: b.country_code,
      productCount: counts[b.slug] ?? 0,
      photoUrl: photoByEntity.get(b.id) ?? null,
    }))
    .filter((b) => b.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
}

// ── Articles, Rankings — still from static data (no CMS yet) ──────────
export { ARTICLES, RANKINGS, getArticles, getArticleBySlug, getRankings, getRankingBySlug } from './static-content'
