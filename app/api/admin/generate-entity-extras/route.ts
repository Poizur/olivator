// POST /api/admin/generate-entity-extras
// Body: { entityType: 'region'|'brand'|'cultivar', slug: string }
// Vrací: { ok, extras: RegionExtrasOutput | BrandExtrasOutput | CultivarExtrasOutput }
//
// Admin v EntityEditForm klikne "Vygenerovat doplňky" → modal se naplní návrhem,
// admin schvaluje per item, klikne Apply → modal volá další endpointy
// (PATCH /api/admin/entities pro pole, POST /api/admin/entity-faqs pro FAQ).

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { countryName } from '@/lib/utils'
import {
  generateRegionExtras,
  generateBrandExtras,
  generateCultivarExtras,
} from '@/lib/entity-extras-generator'

export const maxDuration = 60

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { entityType, slug } = body as { entityType: string; slug: string }
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  try {
    if (entityType === 'region') {
      const { data: region } = await supabaseAdmin
        .from('regions')
        .select('id, name, country_code, description_long')
        .eq('slug', slug)
        .single()
      if (!region) return NextResponse.json({ error: 'Region not found' }, { status: 404 })

      const topProducts = await loadTopProducts({ regionSlug: slug })
      const extras = await generateRegionExtras({
        type: 'region',
        name: region.name,
        countryName: countryName(region.country_code),
        descriptionLong: region.description_long,
        productCount: topProducts.length,
        topProducts,
      })
      return NextResponse.json({ ok: true, extras })
    }

    if (entityType === 'brand') {
      const { data: brand } = await supabaseAdmin
        .from('brands')
        .select('id, name, country_code, description_long, story, philosophy, founded_year')
        .eq('slug', slug)
        .single()
      if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

      const topProducts = await loadTopProducts({ brandSlug: slug })
      const extras = await generateBrandExtras({
        type: 'brand',
        name: brand.name,
        countryName: countryName(brand.country_code),
        descriptionLong: brand.description_long,
        story: brand.story,
        philosophy: brand.philosophy,
        foundedYear: brand.founded_year,
        productCount: topProducts.length,
        topProducts,
      })
      return NextResponse.json({ ok: true, extras })
    }

    if (entityType === 'cultivar') {
      const { data: cultivar } = await supabaseAdmin
        .from('cultivars')
        .select('id, name, description_long')
        .eq('slug', slug)
        .single()
      if (!cultivar) return NextResponse.json({ error: 'Cultivar not found' }, { status: 404 })

      const topProducts = await loadTopProducts({ cultivarSlug: slug })

      // Země kde se pěstuje
      const countriesGrown = Array.from(
        new Set(
          topProducts
            .map((p) => p.originCountry)
            .filter((c): c is string => !!c)
            .map((c) => countryName(c))
        )
      )

      const polysWithValue = topProducts
        .map((p) => p.polyphenols)
        .filter((v): v is number => v != null)
      const avgPolyphenols =
        polysWithValue.length > 0
          ? Math.round(polysWithValue.reduce((s, v) => s + v, 0) / polysWithValue.length)
          : null

      const extras = await generateCultivarExtras({
        type: 'cultivar',
        name: cultivar.name,
        descriptionLong: cultivar.description_long,
        productCount: topProducts.length,
        topProducts,
        countriesGrown,
        avgPolyphenols,
      })
      return NextResponse.json({ ok: true, extras })
    }

    return NextResponse.json({ error: `Unknown entityType: ${entityType}` }, { status: 400 })
  } catch (err) {
    console.error('[generate-entity-extras]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

async function loadTopProducts(filter: {
  regionSlug?: string
  brandSlug?: string
  cultivarSlug?: string
}): Promise<
  Array<{
    name: string
    olivatorScore: number | null
    acidity: number | null
    polyphenols: number | null
    cultivars?: string[]
    originCountry?: string
  }>
> {
  let productIds: string[] = []

  if (filter.regionSlug) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('region_slug', filter.regionSlug)
      .eq('status', 'active')
      .order('olivator_score', { ascending: false })
      .limit(10)
    productIds = (data ?? []).map((r: { id: string }) => r.id)
  } else if (filter.brandSlug) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('brand_slug', filter.brandSlug)
      .eq('status', 'active')
      .order('olivator_score', { ascending: false })
      .limit(10)
    productIds = (data ?? []).map((r: { id: string }) => r.id)
  } else if (filter.cultivarSlug) {
    const { data: links } = await supabaseAdmin
      .from('product_cultivars')
      .select('product_id')
      .eq('cultivar_slug', filter.cultivarSlug)
    const allIds = (links ?? []).map((r: { product_id: string }) => r.product_id)
    if (allIds.length === 0) return []
    const { data } = await supabaseAdmin
      .from('products')
      .select('id')
      .in('id', allIds)
      .eq('status', 'active')
      .order('olivator_score', { ascending: false })
      .limit(10)
    productIds = (data ?? []).map((r: { id: string }) => r.id)
  }

  if (productIds.length === 0) return []

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, olivator_score, acidity, polyphenols, origin_country')
    .in('id', productIds)

  const { data: cultivarLinks } = await supabaseAdmin
    .from('product_cultivars')
    .select('product_id, cultivars!inner(name)')
    .in('product_id', productIds)

  const cultivarsByProduct = new Map<string, string[]>()
  for (const link of (cultivarLinks ?? []) as unknown as Array<{
    product_id: string
    cultivars: { name: string } | { name: string }[] | null
  }>) {
    const list = cultivarsByProduct.get(link.product_id) ?? []
    const c = Array.isArray(link.cultivars) ? link.cultivars[0] : link.cultivars
    if (c) list.push(c.name)
    cultivarsByProduct.set(link.product_id, list)
  }

  return ((products ?? []) as Array<{
    id: string
    name: string
    olivator_score: number | null
    acidity: number | null
    polyphenols: number | null
    origin_country: string | null
  }>).map((p) => ({
    name: p.name,
    olivatorScore: p.olivator_score,
    acidity: p.acidity,
    polyphenols: p.polyphenols,
    cultivars: cultivarsByProduct.get(p.id) ?? [],
    originCountry: p.origin_country ?? undefined,
  }))
}
