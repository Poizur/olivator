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
  const { data: products } = await supabaseAdmin
    .from('products')
    .select(`
      id, slug, name, name_short, image_url, olivator_score,
      brands ( name, slug )
    `)
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
    .limit(30)

  if (!products) return null

  for (const p of products) {
    if (excludeProductIds.includes(p.id as string)) continue

    // Najdi nejlevnější aktivní nabídku
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select(`
        price, currency, in_stock,
        retailers ( name, slug, is_active )
      `)
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .order('price', { ascending: true })

    type OfferRow = {
      price: number
      currency: string
      in_stock: boolean
      retailers: { name: string; slug: string; is_active: boolean } | null
    }
    const validOffers = ((offers ?? []) as unknown as OfferRow[]).filter(
      (o) => o.retailers?.is_active === true
    )
    if (validOffers.length === 0) continue
    const cheapest = validOffers[0]

    // Najdi minimální cenu za posledních 30 dnů (kontext: drop?)
    const { data: history } = await supabaseAdmin
      .from('price_history')
      .select('price')
      .eq('product_id', p.id)
      .gte('recorded_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('price', { ascending: false })
      .limit(1)

    const oldPrice = history?.[0]?.price ?? null
    const hasDrop = oldPrice && oldPrice > cheapest.price && (oldPrice - cheapest.price) / oldPrice > 0.05

    type Brand = { name: string; slug: string } | null
    const brand = (p.brands as unknown as Brand) ?? null
    const productName = (p.name_short as string | null) ?? (p.name as string)

    const reasoning = hasDrop
      ? `Score ${p.olivator_score} a aktuálně sleva ${Math.round(((oldPrice! - cheapest.price) / oldPrice!) * 100)} % oproti měsíčnímu maximu — silný moment k vyzkoušení.`
      : (p.olivator_score as number) >= 80
      ? `Patří mezi nejlépe hodnocené v katalogu. Kvalita ověřená Olivator Score ${p.olivator_score}.`
      : `Aktuálně Score ${p.olivator_score} — solidní volba k tomu typu pokrmů.`

    return {
      productId: p.id as string,
      slug: p.slug as string,
      name: productName,
      brandName: brand?.name ?? null,
      imageUrl: p.image_url as string | null,
      score: p.olivator_score as number,
      price: cheapest.price,
      oldPrice: hasDrop ? oldPrice : null,
      retailerName: cheapest.retailers!.name,
      retailerSlug: cheapest.retailers!.slug,
      ctaUrl: buildAffiliateUrl(cheapest.retailers!.slug, p.slug as string, 'oil_of_week'),
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
  // Pull aktuální offers + porovnej s history
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select(`
      product_id, price, in_stock,
      products ( id, slug, name, name_short, status, olivator_score ),
      retailers ( name, slug, is_active )
    `)
    .eq('in_stock', true)

  if (!offers) return []

  type OfferData = {
    product_id: string
    price: number
    in_stock: boolean
    products: {
      id: string
      slug: string
      name: string
      name_short: string | null
      status: string
      olivator_score: number
    } | null
    retailers: { name: string; slug: string; is_active: boolean } | null
  }

  const candidates: DealData[] = []

  // Group by product_id, pick cheapest offer
  const byProduct = new Map<string, OfferData>()
  for (const o of offers as unknown as OfferData[]) {
    if (!o.products || !o.retailers) continue
    if (o.products.status !== 'active') continue
    if (!o.retailers.is_active) continue
    if (excludeProductIds.includes(o.product_id)) continue
    const existing = byProduct.get(o.product_id)
    if (!existing || o.price < existing.price) byProduct.set(o.product_id, o)
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

    const productName =
      offer.products!.name_short ?? offer.products!.name

    candidates.push({
      productId: offer.product_id,
      name: productName,
      oldPrice: maxPrice,
      newPrice: offer.price,
      dropPct: Math.round(dropPct),
      retailerName: offer.retailers!.name,
      retailerSlug: offer.retailers!.slug,
      ctaUrl: buildAffiliateUrl(
        offer.retailers!.slug,
        offer.products!.slug,
        'deal_radar'
      ),
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
  const since = new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: products } = await supabaseAdmin
    .from('products')
    .select(`
      id, slug, name, name_short, image_url, olivator_score,
      brands ( name, slug )
    `)
    .eq('status', 'active')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!products || products.length === 0) return null

  for (const p of products) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select(`
        price, in_stock,
        retailers ( name, slug, is_active )
      `)
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .order('price', { ascending: true })
      .limit(1)

    type OfferRow = {
      price: number
      in_stock: boolean
      retailers: { name: string; slug: string; is_active: boolean } | null
    }
    const validOffer = ((offers ?? []) as unknown as OfferRow[]).find(
      (o) => o.retailers?.is_active === true
    )
    if (!validOffer) continue

    type Brand = { name: string; slug: string } | null
    const brand = (p.brands as unknown as Brand) ?? null

    return {
      productId: p.id as string,
      slug: p.slug as string,
      name: (p.name_short as string | null) ?? (p.name as string),
      brandName: brand?.name ?? null,
      imageUrl: p.image_url as string | null,
      score: p.olivator_score as number,
      price: validOffer.price,
      oldPrice: null,
      retailerName: validOffer.retailers!.name,
      retailerSlug: validOffer.retailers!.slug,
      ctaUrl: buildAffiliateUrl(
        validOffer.retailers!.slug,
        p.slug as string,
        'new_arrival'
      ),
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
