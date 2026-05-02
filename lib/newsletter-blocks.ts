// Newsletter block generators — každý získává data z DB pro 1 typ bloku.
// Composer pak vybere které bloky se použijí v daném draftu.
//
// Princip: každý generator vrátí typed data — ne HTML. Render jde v emails/*.tsx.

import { supabaseAdmin } from './supabase'

const SITE_URL = 'https://olivator.cz'

// ── Shared types ───────────────────────────────────────────────────────────

export interface OilCardData {
  productId: string
  slug: string
  name: string
  brandName: string | null
  imageUrl: string | null
  score: number
  price: number
  oldPrice: number | null
  retailerName: string
  retailerSlug: string
  ctaUrl: string  // Affiliate URL: /go/[retailer]/[slug]
  reasoning: string | null
}

export interface DealData {
  productId: string
  name: string
  oldPrice: number
  newPrice: number
  dropPct: number
  retailerName: string
  retailerSlug: string
  ctaUrl: string
  context: string  // "90denní minimum" / "klesla o 80 Kč za týden"
}

export interface FactData {
  id: string
  body: string
  category: string
}

export interface RecipeData {
  slug: string
  title: string
  excerpt: string
  url: string  // /recept/[slug]
  /** Doporučený olej k receptu (volitelný) */
  pairedOil: OilCardData | null
}

// ── Helper: build affiliate URL ────────────────────────────────────────────

function buildAffiliateUrl(retailerSlug: string, productSlug: string, utmContent: string): string {
  const params = new URLSearchParams({
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_content: utmContent,
  })
  return `${SITE_URL}/go/${retailerSlug}/${productSlug}?${params.toString()}`
}

// ── Helper: načti retailer/brand mapy (1× per pick funkce) ─────────────────
//
// Důvod: Supabase nested select `retailers ( ... )` může vrátit null pokud
// FK constraint není v DB schématu. Bezpečnější: 2 separate queries + Map.
async function loadRetailerMap(): Promise<Map<string, { name: string; slug: string; is_active: boolean }>> {
  const { data } = await supabaseAdmin.from('retailers').select('id, name, slug, is_active')
  const map = new Map<string, { name: string; slug: string; is_active: boolean }>()
  for (const r of data ?? []) {
    map.set(r.id as string, {
      name: r.name as string,
      slug: r.slug as string,
      is_active: r.is_active as boolean,
    })
  }
  return map
}

async function loadBrandMap(): Promise<Map<string, { name: string; slug: string }>> {
  const { data } = await supabaseAdmin.from('brands').select('id, name, slug')
  const map = new Map<string, { name: string; slug: string }>()
  for (const b of data ?? []) {
    map.set(b.id as string, { name: b.name as string, slug: b.slug as string })
  }
  return map
}

// ── 1. Olej týdne — kurátorský pick ────────────────────────────────────────
//
// Strategie výběru:
//  - Nejvyšší Score co MÁ aktivní nabídku (žádný hard threshold — bereme co máme)
//  - Není ten samý jako minulý týden (LRU)
//  - Preferuj olej co má drop > 10 % (vědět "proč právě teď")
//
// Returns null pouze pokud catalog je prázdný nebo nikdo nemá aktivní nabídku.
export async function pickOilOfTheWeek(
  excludeProductIds: string[] = []
): Promise<OilCardData | null> {
  const [retailerMap, brandMap] = await Promise.all([loadRetailerMap(), loadBrandMap()])

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, image_url, olivator_score, brand_id')
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
    .limit(30)

  if (!products) return null

  for (const p of products) {
    if (excludeProductIds.includes(p.id as string)) continue

    // Načti všechny in_stock offers pro tento produkt
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price, currency, in_stock, retailer_id')
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .order('price', { ascending: true })

    if (!offers || offers.length === 0) continue

    // Přilep retailer info z mapy
    const enriched = offers
      .map((o) => ({
        price: o.price as number,
        retailer: retailerMap.get(o.retailer_id as string) ?? null,
      }))
      .filter((o) => o.retailer !== null) as Array<{
        price: number
        retailer: { name: string; slug: string; is_active: boolean }
      }>

    if (enriched.length === 0) continue
    // Preferuj is_active retailera, fallback jakýkoliv
    const cheapest = enriched.find((o) => o.retailer.is_active) ?? enriched[0]

    // Min cena 30d (drop kontext)
    const { data: history } = await supabaseAdmin
      .from('price_history')
      .select('price')
      .eq('product_id', p.id)
      .gte('recorded_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('price', { ascending: false })
      .limit(1)

    const oldPrice = (history?.[0]?.price as number | undefined) ?? null
    const hasDrop = oldPrice && oldPrice > cheapest.price && (oldPrice - cheapest.price) / oldPrice > 0.05

    const brand = p.brand_id ? brandMap.get(p.brand_id as string) ?? null : null
    const productName = (p.name_short as string | null) ?? (p.name as string)

    const reasoning = hasDrop
      ? `Score ${p.olivator_score} a aktuálně sleva ${Math.round(((oldPrice! - cheapest.price) / oldPrice!) * 100)} % oproti měsíčnímu maximu — silný moment k vyzkoušení.`
      : (p.olivator_score as number) >= 80
      ? `Patří mezi nejlépe hodnocené v katalogu. Kvalita ověřená Olivator Score ${p.olivator_score}.`
      : `Aktuálně Score ${p.olivator_score} — solidní volba k danému typu pokrmů.`

    return {
      productId: p.id as string,
      slug: p.slug as string,
      name: productName,
      brandName: brand?.name ?? null,
      imageUrl: p.image_url as string | null,
      score: p.olivator_score as number,
      price: cheapest.price,
      oldPrice: hasDrop ? oldPrice : null,
      retailerName: cheapest.retailer.name,
      retailerSlug: cheapest.retailer.slug,
      ctaUrl: buildAffiliateUrl(cheapest.retailer.slug, p.slug as string, 'oil_of_week'),
      reasoning,
    }
  }
  return null
}

// ── 2. Slevový radar — top N drops ─────────────────────────────────────────
//
// Najde produkty kde aktuální cena je významně nižší než historický průměr
// za posledních 30-90 dnů.
export async function pickDeals(
  minDropPct = 10,
  limit = 5,
  excludeProductIds: string[] = []
): Promise<DealData[]> {
  const retailerMap = await loadRetailerMap()

  // Pull aktuální in_stock offers
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price, retailer_id')
    .eq('in_stock', true)

  if (!offers || offers.length === 0) return []

  // Načti products data (status + name) jednou
  const productIds = Array.from(new Set(offers.map((o) => o.product_id as string)))
  const { data: productsData } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, status, olivator_score')
    .in('id', productIds)
  const productMap = new Map<string, {
    slug: string
    name: string
    name_short: string | null
    status: string
    olivator_score: number
  }>()
  for (const p of productsData ?? []) {
    productMap.set(p.id as string, {
      slug: p.slug as string,
      name: p.name as string,
      name_short: p.name_short as string | null,
      status: p.status as string,
      olivator_score: p.olivator_score as number,
    })
  }

  interface OfferData {
    product_id: string
    price: number
    retailer: { name: string; slug: string; is_active: boolean }
    product: { slug: string; name: string; name_short: string | null; olivator_score: number }
  }

  const candidates: DealData[] = []

  // Group by product_id, pick cheapest offer (preferuj is_active retailer)
  const byProduct = new Map<string, OfferData>()
  for (const o of offers) {
    const productId = o.product_id as string
    const product = productMap.get(productId)
    const retailer = retailerMap.get(o.retailer_id as string)
    if (!product || !retailer) continue
    if (product.status !== 'active') continue
    if (excludeProductIds.includes(productId)) continue

    const candidate: OfferData = {
      product_id: productId,
      price: o.price as number,
      retailer,
      product: {
        slug: product.slug,
        name: product.name,
        name_short: product.name_short,
        olivator_score: product.olivator_score,
      },
    }

    const existing = byProduct.get(productId)
    if (!existing) {
      byProduct.set(productId, candidate)
    } else {
      // Preferuj active retailer; pokud oba stejné, levnější
      const existingActive = existing.retailer.is_active
      const newActive = candidate.retailer.is_active
      if ((newActive && !existingActive) || (newActive === existingActive && candidate.price < existing.price)) {
        byProduct.set(productId, candidate)
      }
    }
  }

  for (const offer of byProduct.values()) {
    // Najdi 90d max cenu pro tento produkt
    const { data: history } = await supabaseAdmin
      .from('price_history')
      .select('price, recorded_at')
      .eq('product_id', offer.product_id)
      .gte('recorded_at', new Date(Date.now() - 90 * 86400000).toISOString())
      .order('price', { ascending: false })
      .limit(1)

    if (!history || history.length === 0) continue
    const maxPrice = history[0].price as number
    if (maxPrice <= offer.price) continue

    const dropPct = ((maxPrice - offer.price) / maxPrice) * 100
    if (dropPct < minDropPct) continue

    // Najdi 90d minimum (jestli jsme na minimu)
    const { data: minHistory } = await supabaseAdmin
      .from('price_history')
      .select('price')
      .eq('product_id', offer.product_id)
      .gte('recorded_at', new Date(Date.now() - 90 * 86400000).toISOString())
      .order('price', { ascending: true })
      .limit(1)
    const minPrice = (minHistory?.[0]?.price as number) ?? offer.price
    const isAtMin = offer.price <= minPrice * 1.02

    const productName = offer.product.name_short ?? offer.product.name

    candidates.push({
      productId: offer.product_id,
      name: productName,
      oldPrice: maxPrice,
      newPrice: offer.price,
      dropPct: Math.round(dropPct),
      retailerName: offer.retailer.name,
      retailerSlug: offer.retailer.slug,
      ctaUrl: buildAffiliateUrl(offer.retailer.slug, offer.product.slug, 'deal_radar'),
      context: isAtMin
        ? '90denní minimum'
        : `Klesla z ${Math.round(maxPrice)} Kč za poslední měsíc`,
    })
  }

  return candidates
    .sort((a, b) => b.dropPct - a.dropPct)
    .slice(0, limit)
}

// ── 3. Premiéra — nejnovější active produkt ────────────────────────────────
//
// Najde produkty kde created_at < 30 dnů, status='active'. Bez score threshold —
// novinka stojí za zmínku i kdyby byla 60+. Když je málo dat, rozšiřujeme okno.
export async function pickNewArrival(): Promise<OilCardData | null> {
  const [retailerMap, brandMap] = await Promise.all([loadRetailerMap(), loadBrandMap()])
  const since = new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, image_url, olivator_score, brand_id')
    .eq('status', 'active')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!products || products.length === 0) return null

  for (const p of products) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price, in_stock, retailer_id')
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .order('price', { ascending: true })

    if (!offers || offers.length === 0) continue

    const enriched = offers
      .map((o) => ({
        price: o.price as number,
        retailer: retailerMap.get(o.retailer_id as string) ?? null,
      }))
      .filter((o) => o.retailer !== null) as Array<{
        price: number
        retailer: { name: string; slug: string; is_active: boolean }
      }>

    if (enriched.length === 0) continue
    const cheapest = enriched.find((o) => o.retailer.is_active) ?? enriched[0]

    const brand = p.brand_id ? brandMap.get(p.brand_id as string) ?? null : null

    return {
      productId: p.id as string,
      slug: p.slug as string,
      name: (p.name_short as string | null) ?? (p.name as string),
      brandName: brand?.name ?? null,
      imageUrl: p.image_url as string | null,
      score: p.olivator_score as number,
      price: cheapest.price,
      oldPrice: null,
      retailerName: cheapest.retailer.name,
      retailerSlug: cheapest.retailer.slug,
      ctaUrl: buildAffiliateUrl(cheapest.retailer.slug, p.slug as string, 'new_arrival'),
      reasoning: `Nový olej v katalogu — Score ${p.olivator_score}, čerstvě validovaný.`,
    }
  }
  return null
}

// ── 4. Educational fact — least-recently-used z databáze ───────────────────
export async function pickFact(): Promise<FactData | null> {
  const { data: facts } = await supabaseAdmin
    .from('newsletter_facts')
    .select('id, body, category, last_used_at')
    .eq('active', true)
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(1)

  if (!facts || facts.length === 0) return null
  const fact = facts[0]

  // Označ jako použité
  await supabaseAdmin
    .from('newsletter_facts')
    .update({
      used_count: 1,  // increment via RPC by možnost; pro start upsert
      last_used_at: new Date().toISOString(),
    })
    .eq('id', fact.id)

  return {
    id: fact.id as string,
    body: fact.body as string,
    category: fact.category as string,
  }
}

// ── 5. Recept týdne — z ARTICLES (static content) ──────────────────────────
//
// Recepty jsou static MD články. Picker rotuje přes recipe_entity_links data
// abychom věděli k jakému oleji recept patří.
export async function pickRecipe(): Promise<RecipeData | null> {
  const { ARTICLES } = await import('./static-content')
  const recipes = ARTICLES.filter((a) => a.category === 'recept')
  if (recipes.length === 0) return null

  // Pseudorandom: použij týden v roce jako seed
  const weekOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000)
  )
  const recipe = recipes[weekOfYear % recipes.length]

  return {
    slug: recipe.slug,
    title: recipe.title,
    excerpt: recipe.excerpt,
    url: `${SITE_URL}/recept/${recipe.slug}?utm_source=newsletter&utm_medium=email&utm_content=recipe`,
    pairedOil: null, // V budoucnu: lookup přes recipe_entity_links na region/cultivar
  }
}

// ── 6. Stats — pro debug / preview / hook generation ───────────────────────
export async function getNewsletterStats(): Promise<{
  totalProducts: number
  totalSubscribers: number
  recentDrops: number
  recentNew: number
}> {
  const [products, subs, drops, newP] = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('newsletter_signups').select('*', { count: 'exact', head: true }).eq('confirmed', true).eq('unsubscribed', false),
    pickDeals(10, 100), // count pro hook
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString()),
  ])

  return {
    totalProducts: products.count ?? 0,
    totalSubscribers: subs.count ?? 0,
    recentDrops: drops.length,
    recentNew: newP.count ?? 0,
  }
}
