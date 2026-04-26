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
}

export async function upsertRetailer(input: RetailerInput, id?: string) {
  const payload = {
    name: input.name,
    slug: input.slug,
    domain: input.domain,
    affiliate_network: input.affiliateNetwork,
    base_tracking_url: input.baseTrackingUrl || null,
    default_commission_pct: input.defaultCommissionPct,
    is_active: input.isActive,
    market: input.market,
  }

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
  volumeMl: number | null
  packaging: string | null
}

/** Updates only fields that are currently NULL in DB, always refreshes source_url + raw_description. */
export async function applyRescrapePatch(id: string, patch: RescrapePatch): Promise<{ filled: string[] }> {
  const { data: existing, error: readErr } = await supabaseAdmin
    .from('products')
    .select('ean, acidity, polyphenols, peroxide_value, volume_ml, packaging')
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

// ── Articles, Rankings — still from static data (no CMS yet) ──────────
export { ARTICLES, RANKINGS, getArticles, getArticleBySlug, getRankings, getRankingBySlug } from './static-content'
