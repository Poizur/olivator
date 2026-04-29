/**
 * Phase A.4 — Generate AI content for regions, brands, cultivars.
 *
 * Fetches entity rows from DB, pulls related product data, calls
 * entity-content-generator, and writes description back to DB.
 *
 * Run: node --env-file=.env.local --import tsx scripts/generate-entity-content.ts
 * Flags: --only=regions  --only=brands  --only=cultivars
 *        --slug=peloponnes  (single entity)
 */

import { supabaseAdmin } from '@/lib/supabase'
import {
  generateRegionContent,
  generateBrandContent,
  generateCultivarContent,
} from '@/lib/entity-content-generator'

const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const TARGET_SLUG = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1]

function log(msg: string) { process.stdout.write(msg + '\n') }

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string
  name: string
  slug: string
  olivator_score: number | null
  acidity: string | number | null
  polyphenols: number | null
  certifications: string[] | null
  brand_slug: string | null
  region_slug: string | null
}

async function cheapestPrice(productId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('product_offers')
    .select('price')
    .eq('product_id', productId)
    .eq('in_stock', true)
    .order('price', { ascending: true })
    .limit(1)
  return data?.[0]?.price ?? null
}

async function cultivarSlugsForProduct(productId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('product_cultivars')
    .select('cultivar_slug')
    .eq('product_id', productId)
  return (data ?? []).map((r: { cultivar_slug: string }) => r.cultivar_slug)
}

// ── Regions ───────────────────────────────────────────────────────────────────

async function processRegions() {
  log('\n=== Generating region content ===')

  let query = supabaseAdmin.from('regions').select('*')
  if (TARGET_SLUG) query = query.eq('slug', TARGET_SLUG)
  const { data: regions, error } = await query
  if (error) throw error

  for (const region of regions ?? []) {
    log(`  → ${region.slug}`)

    // Fetch products for this region
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, olivator_score, acidity, polyphenols, certifications, brand_slug, region_slug')
      .eq('region_slug', region.slug)
      .eq('status', 'active')
      .order('olivator_score', { ascending: false })
      .limit(10) as { data: ProductRow[] | null }

    if (!products || products.length === 0) {
      log(`    ⚠ no active products, skipping`)
      continue
    }

    const topProducts = await Promise.all(
      products.slice(0, 5).map(async (p) => ({
        name: p.name,
        olivatorScore: p.olivator_score ?? 0,
        acidity: p.acidity != null ? Number(p.acidity) : null,
        polyphenols: p.polyphenols,
        certifications: p.certifications ?? [],
        cheapestPrice: await cheapestPrice(p.id),
        slug: p.slug,
      }))
    )

    // Collect cultivar names
    const cultivarSlugsSet = new Set<string>()
    for (const p of products) {
      const cs = await cultivarSlugsForProduct(p.id)
      cs.forEach((c) => cultivarSlugsSet.add(c))
    }
    const cultivarNames = [...cultivarSlugsSet]
      .map((s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '))

    const countryName = region.country_code === 'GR' ? 'Řecko' : region.country_code === 'IT' ? 'Itálie' : region.country_code

    const description = await generateRegionContent({
      name: region.name,
      countryCode: region.country_code,
      countryName,
      productCount: products.length,
      topProducts,
      commonCultivars: cultivarNames,
    })

    const { error: updateErr } = await supabaseAdmin
      .from('regions')
      .update({ description_long: description, updated_at: new Date().toISOString() })
      .eq('slug', region.slug)

    if (updateErr) log(`    ✗ ${updateErr.message}`)
    else log(`    ✓ ${description.length} chars`)
  }
}

// ── Brands ────────────────────────────────────────────────────────────────────

async function processBrands() {
  log('\n=== Generating brand content ===')

  let query = supabaseAdmin.from('brands').select('*')
  if (TARGET_SLUG) query = query.eq('slug', TARGET_SLUG)
  const { data: brands, error } = await query
  if (error) throw error

  for (const brand of brands ?? []) {
    log(`  → ${brand.slug}`)

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, olivator_score, acidity, polyphenols, certifications, brand_slug, region_slug')
      .eq('brand_slug', brand.slug)
      .eq('status', 'active')
      .order('olivator_score', { ascending: false })
      .limit(10) as { data: ProductRow[] | null }

    if (!products || products.length === 0) {
      log(`    ⚠ no active products, skipping`)
      continue
    }

    const topProducts = await Promise.all(
      products.map(async (p) => ({
        name: p.name,
        olivatorScore: p.olivator_score ?? 0,
        acidity: p.acidity != null ? Number(p.acidity) : null,
        polyphenols: p.polyphenols,
        certifications: p.certifications ?? [],
        cheapestPrice: await cheapestPrice(p.id),
        slug: p.slug,
      }))
    )

    const cultivarSlugsSet = new Set<string>()
    for (const p of products) {
      const cs = await cultivarSlugsForProduct(p.id)
      cs.forEach((c) => cultivarSlugsSet.add(c))
    }
    const cultivarNames = [...cultivarSlugsSet]
      .map((s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '))

    // Find region name for this brand (most common region_slug)
    const regionSlugs = products.map((p) => p.region_slug).filter(Boolean)
    const regionSlug = regionSlugs.length > 0
      ? regionSlugs.sort((a, b) =>
          regionSlugs.filter((v) => v === b).length - regionSlugs.filter((v) => v === a).length
        )[0]
      : null

    let regionName: string | null = null
    if (regionSlug) {
      const { data: regionRow } = await supabaseAdmin
        .from('regions').select('name').eq('slug', regionSlug).single()
      regionName = regionRow?.name ?? null
    }

    const countryName = brand.country_code === 'GR' ? 'Řecko' : brand.country_code === 'IT' ? 'Itálie' : brand.country_code

    const description = await generateBrandContent({
      name: brand.name,
      countryCode: brand.country_code,
      countryName,
      regionName,
      productCount: products.length,
      topProducts,
      commonCultivars: cultivarNames,
    })

    const { error: updateErr } = await supabaseAdmin
      .from('brands')
      .update({ description_long: description, updated_at: new Date().toISOString() })
      .eq('slug', brand.slug)

    if (updateErr) log(`    ✗ ${updateErr.message}`)
    else log(`    ✓ ${description.length} chars`)
  }
}

// ── Cultivars ─────────────────────────────────────────────────────────────────

const CULTIVAR_PROFILES: Record<string, { acidity: string; polyphenols: string; flavor: string }> = {
  koroneiki:    { acidity: '0.1–0.4 %', polyphenols: '400–900 mg/kg', flavor: 'intenzivně ovocný, hořký, štiplavý, bylinkový' },
  manaki:       { acidity: '0.2–0.5 %', polyphenols: '200–500 mg/kg', flavor: 'mírně ovocný, jemná hořkost, mandlové tóny' },
  kalamata:     { acidity: '0.3–0.6 %', polyphenols: '300–600 mg/kg', flavor: 'ovocný, sladší, jemná hořkost' },
  coratina:     { acidity: '0.1–0.3 %', polyphenols: '500–1000 mg/kg', flavor: 'velmi intenzivní, hořký, štiplavý, artičokový' },
  'cima-di-mola': { acidity: '0.2–0.4 %', polyphenols: '300–600 mg/kg', flavor: 'ovocný, elegantní, středně hořký, bylinky' },
}

async function processCultivars() {
  log('\n=== Generating cultivar content ===')

  let query = supabaseAdmin.from('cultivars').select('*')
  if (TARGET_SLUG) query = query.eq('slug', TARGET_SLUG)
  const { data: cultivars, error } = await query
  if (error) throw error

  for (const cultivar of cultivars ?? []) {
    log(`  → ${cultivar.slug}`)

    // Products with this cultivar
    const { data: links } = await supabaseAdmin
      .from('product_cultivars')
      .select('product_id')
      .eq('cultivar_slug', cultivar.slug)

    const productIds = (links ?? []).map((l: { product_id: string }) => l.product_id)

    if (productIds.length === 0) {
      log(`    ⚠ no products, skipping`)
      continue
    }

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, olivator_score, region_slug')
      .in('id', productIds)
      .eq('status', 'active')
      .order('olivator_score', { ascending: false })
      .limit(10)

    if (!products || products.length === 0) {
      log(`    ⚠ no active products, skipping`)
      continue
    }

    const topProducts = await Promise.all(
      products.slice(0, 5).map(async (p: { id: string; name: string; slug: string; olivator_score: number | null; region_slug: string | null }) => ({
        name: p.name,
        olivatorScore: p.olivator_score ?? 0,
        cheapestPrice: await cheapestPrice(p.id),
        slug: p.slug,
      }))
    )

    // Collect region names
    const regionSlugs = [...new Set(
      products.map((p: { region_slug: string | null }) => p.region_slug).filter(Boolean)
    )] as string[]
    const regionNames: string[] = []
    for (const rs of regionSlugs) {
      const { data: r } = await supabaseAdmin.from('regions').select('name').eq('slug', rs).single()
      if (r?.name) regionNames.push(r.name)
    }

    const profile = CULTIVAR_PROFILES[cultivar.slug] ?? {
      acidity: 'proměnlivá',
      polyphenols: 'proměnlivé',
      flavor: 'závisí na oblasti a sklizni',
    }

    const description = await generateCultivarContent({
      name: cultivar.name,
      originRegions: regionNames,
      typicalAcidity: profile.acidity,
      typicalPolyphenols: profile.polyphenols,
      flavorProfile: profile.flavor,
      productCount: products.length,
      topProducts,
    })

    const { error: updateErr } = await supabaseAdmin
      .from('cultivars')
      .update({ description_long: description, updated_at: new Date().toISOString() })
      .eq('slug', cultivar.slug)

    if (updateErr) log(`    ✗ ${updateErr.message}`)
    else log(`    ✓ ${description.length} chars`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  try {
    if (!ONLY || ONLY === 'regions') await processRegions()
    if (!ONLY || ONLY === 'brands') await processBrands()
    if (!ONLY || ONLY === 'cultivars') await processCultivars()
    log('\n✅ Entity content generation complete')
  } catch (err) {
    log('\n❌ ' + String(err))
    process.exit(1)
  }
}

main()
