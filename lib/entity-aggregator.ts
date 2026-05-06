// Entity aggregator — počítá souhrnné metriky odrůd/oblastí/značek
// z aktuálních produktů. Volá se:
//   1) z publishCandidate (po INSERTu nového produktu)
//   2) z admin akcí (po změně product_cultivars / brand_slug / region_slug)
//   3) z cron jobu (denní rebuild všech entit)
//
// Auto-fill respektuje admin override: pokud cultivar.auto_filled_at IS NULL
// a flavor_profile není prázdný, znamená to že admin zapsal data ručně —
// neaktualizujeme.

import { supabaseAdmin } from '@/lib/supabase'

// Mapování product flavor klíčů (anglicky) → cultivar flavor klíčů (česky).
// Brief.md mluví o pikantnosti, hořkosti, travnatých/ovocných/mandlových tónech.
const PRODUCT_TO_CULTIVAR_FLAVOR: Record<string, string> = {
  spicy: 'pikantnost',
  bitter: 'horkost',
  herbal: 'travnate',
  fruity: 'ovocne',
  nutty: 'mandlove',
}

// Vstup pro auto-fill — produkt má volitelné flavor_profile (JSONB) a
// chemické metriky.
interface ProductForAgg {
  id: string
  flavor_profile: Record<string, number> | null
  polyphenols: number | null
  acidity: number | null
}

/**
 * Spočítá auto-fill data pro jednu odrůdu z jejích produktů.
 * Vrací null pokud odrůda nemá žádné produkty s daty.
 */
function aggregateCultivarFromProducts(products: ProductForAgg[]): {
  flavorProfile: Record<string, number>
  intensityScore: number | null
} | null {
  if (products.length === 0) return null

  // Průměr přes všechny produkty které mají daný klíč
  const flavorSums: Record<string, { sum: number; count: number }> = {}
  for (const p of products) {
    const fp = p.flavor_profile ?? {}
    for (const [productKey, cultivarKey] of Object.entries(PRODUCT_TO_CULTIVAR_FLAVOR)) {
      const v = fp[productKey]
      if (typeof v === 'number' && !isNaN(v) && v >= 0) {
        if (!flavorSums[cultivarKey]) flavorSums[cultivarKey] = { sum: 0, count: 0 }
        flavorSums[cultivarKey].sum += v
        flavorSums[cultivarKey].count += 1
      }
    }
  }

  // Pokud žádný produkt neměl flavor data, vrátíme null
  if (Object.keys(flavorSums).length === 0) return null

  // Produkty mají flavor_profile na škále 0-100, převedeme na 0-10
  const flavorProfile: Record<string, number> = {}
  for (const [key, { sum, count }] of Object.entries(flavorSums)) {
    flavorProfile[key] = Math.round((sum / count / 10) * 10) / 10
  }

  // Intenzita = max(pikantnost, horkost) — empirický odhad
  const intensitySource = Math.max(
    flavorProfile.pikantnost ?? 0,
    flavorProfile.horkost ?? 0
  )
  const intensityScore = intensitySource > 0 ? Math.round(intensitySource) : null

  return { flavorProfile, intensityScore }
}

/**
 * Přepočítá flavor_profile + intensity_score pro jednu odrůdu na základě
 * jejích produktů. Respektuje admin override (auto_filled_at IS NULL = admin
 * data, neměníme). Vrací true pokud byla odrůda updatovaná.
 */
export async function recomputeCultivar(slug: string): Promise<boolean> {
  // 1. Načti aktuální stav cultivar
  const { data: cultivar, error: cultivarErr } = await supabaseAdmin
    .from('cultivars')
    .select('id, auto_filled_at, flavor_profile')
    .eq('slug', slug)
    .maybeSingle()
  if (cultivarErr || !cultivar) return false

  // Admin override check: cultivar má data ALE auto_filled_at je NULL
  // → admin zapsal ručně, nepřepisujeme
  const fp = cultivar.flavor_profile as Record<string, number> | null
  const hasData = fp && Object.keys(fp).length > 0
  if (hasData && !cultivar.auto_filled_at) {
    return false
  }

  // 2. Načti všechny aktivní produkty s touto odrůdou
  const { data: links } = await supabaseAdmin
    .from('product_cultivars')
    .select('product_id')
    .eq('cultivar_slug', slug)
  const productIds = (links ?? []).map((r: { product_id: string }) => r.product_id)
  if (productIds.length === 0) return false

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, flavor_profile, polyphenols, acidity')
    .in('id', productIds)
    .eq('status', 'active')
  if (!products || products.length === 0) return false

  // 3. Spočítej agregace
  const agg = aggregateCultivarFromProducts(products as ProductForAgg[])
  if (!agg) return false

  // 4. MERGE existující flavor_profile s nově vypočteným.
  // Předtím: replace přepsal celý sloupec → ztráta klíčů z předchozích běhů
  // (např. když nový produkt měl jen pikantnost, mandlové se ztratily).
  // Teď zachováme dosavadní hodnoty a přepíšeme jen klíče, které máme nové.
  const existing = (fp ?? {}) as Record<string, number>
  const merged = { ...existing, ...agg.flavorProfile }

  const { error: updateErr } = await supabaseAdmin
    .from('cultivars')
    .update({
      flavor_profile: merged,
      intensity_score: agg.intensityScore,
      auto_filled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)

  return !updateErr
}

/**
 * Hromadný přepočet všech odrůd. Volá se z denního cronu.
 */
export async function recomputeAllCultivars(): Promise<{ updated: number; skipped: number }> {
  const { data: cultivars } = await supabaseAdmin
    .from('cultivars')
    .select('slug')
  if (!cultivars) return { updated: 0, skipped: 0 }

  let updated = 0
  let skipped = 0
  for (const c of cultivars as Array<{ slug: string }>) {
    const ok = await recomputeCultivar(c.slug)
    if (ok) updated++
    else skipped++
  }
  return { updated, skipped }
}

/**
 * Po publishCandidate: zavolat extract entities + uložit linky + spustit
 * recompute pro každou dotčenou odrůdu. Best-effort — selhání nesmí
 * zablokovat publish.
 *
 * Hybrid přístup pro entity creation:
 * - Region/cultivar = WHITELIST (predefined list v entity-extractor.ts).
 *   Když nematchne, slug se NEpřiřadí (žádný orphan).
 * - Brand = AUTO-CREATE STUB s status='draft' + countryCode z produktu.
 *   Admin to uvidí v /admin/brands jako "K doplnění" a vyplní detaily.
 */
export async function linkAndRecomputeForProduct(
  productId: string,
  productName: string,
  productOriginCountry: string | null,
  productOriginRegion: string | null,
  productDescription: string | null
): Promise<void> {
  try {
    const { extractBrandSlug, extractRegionSlug, extractRegionFromText, detectCultivars } = await import(
      '@/lib/entity-extractor'
    )

    const brandSlug = extractBrandSlug(productName)
    // Pořadí: 1) explicit originRegion (z scrape/admin), 2) fuzzy match
    // z product name (XML drafty obvykle "Sitia P.D.O. Kréta", "Plakias",
    // "Zakynthos" — name obsahuje region), 3) fallback na raw_description.
    const regionSlug =
      extractRegionSlug(productOriginCountry ?? '', productOriginRegion ?? '') ||
      extractRegionFromText(productOriginCountry, productName) ||
      extractRegionFromText(productOriginCountry, productDescription)
    const cultivars = detectCultivars(productName, productDescription ?? null)

    // ── Brand: auto-create stub pokud neexistuje ────────────────────────
    if (brandSlug) {
      await ensureBrandStub(brandSlug, productName, productOriginCountry)
    }

    const patch: Record<string, string> = {}
    if (brandSlug) patch.brand_slug = brandSlug
    if (regionSlug) patch.region_slug = regionSlug
    if (Object.keys(patch).length > 0) {
      await supabaseAdmin.from('products').update(patch).eq('id', productId)
    }

    const affectedCultivars: string[] = []
    for (const c of cultivars) {
      const { error } = await supabaseAdmin
        .from('product_cultivars')
        .upsert(
          { product_id: productId, cultivar_slug: c.slug },
          { onConflict: 'product_id,cultivar_slug', ignoreDuplicates: true }
        )
      if (!error) affectedCultivars.push(c.slug)
    }

    // Recompute aggregate dat pro každou dotčenou odrůdu
    await Promise.all(affectedCultivars.map((slug) => recomputeCultivar(slug)))
  } catch (err) {
    console.warn('[entity-aggregator] linkAndRecompute failed:', err)
  }
}

// Generické prefixy které NIKDY nemají vznikat jako brand (false positive
// z extractBrandSlug když jméno začíná general adjektivem). Whitelist
// chrání před balastem v /admin/brands.
const BRAND_BLACKLIST = new Set([
  'extra', 'premium', 'organic', 'bio', 'eco',
  'olivovy', 'olivový', 'olivovy-olej',
  'griechisches', 'cretan', 'italian', 'spanish',
  'panenský', 'panensky',
])

/**
 * Vytvoří stub záznam v brands tabulce pokud slug ještě neexistuje.
 * Stub má jen slug + name (z produktového jména) + status='draft'.
 * Admin to uvidí v /admin/brands jako "k doplnění" a doplní:
 * - Příběh / philosophy / website
 * - Country code (z produktu jako default)
 * - Status → 'active' až po doplnění
 *
 * Status='draft' znamená že /znacka/[slug] může vrátit 404 nebo zobrazit
 * placeholder dokud admin nedoplní obsah.
 */
async function ensureBrandStub(
  slug: string,
  productName: string,
  countryCode: string | null
): Promise<void> {
  // Sanity check — generic prefixes nesmí vznikat jako značka
  if (BRAND_BLACKLIST.has(slug)) {
    return
  }
  if (slug.length < 2) return

  // Zjistí jestli brand existuje. Pokud ano, nic neděláme.
  const { data: existing } = await supabaseAdmin
    .from('brands')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return

  // Auto-derive jméno: první slovo z product name (case preserve)
  // např. "SITIA Kréta PREMIUM..." → "SITIA"
  // Lepší než slug "sitia" (lowercase).
  const firstWord = productName.split(/\s+/)[0] ?? slug
  const displayName = firstWord.length >= 2 ? firstWord : slug

  const { error } = await supabaseAdmin.from('brands').insert({
    slug,
    name: displayName,
    country_code: countryCode ?? 'XX',  // XX placeholder — admin opraví
    status: 'draft',
  })
  if (error) {
    console.warn(`[entity-aggregator] brand stub insert failed for ${slug}:`, error.message)
  } else {
    console.log(`[entity-aggregator] auto-created brand stub: ${slug} (${displayName})`)
  }
}
