// Flavor match: returns count of products matching flavor_labels chips + optional price.
// Used by FlavorSelector for live "X olejů odpovídá" feedback.
//
// POST body: { labels?: string[], maxPrice?: number | null }
// Returns: { count, slugs: string[], totalWithLabels: number }

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface FlavorQuery {
  labels?: string[]
  maxPrice?: number | null
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as FlavorQuery
  const labels = (body.labels ?? []).filter(Boolean)

  // Base query: active products with offers
  let productQuery = supabaseAdmin
    .from('products')
    .select('slug, olivator_score, flavor_labels')
    .eq('status', 'active')

  if (labels.length > 0) {
    // Postgres array overlap (&&): product must have at least one of the requested labels
    productQuery = productQuery.overlaps('flavor_labels', labels)
  }

  const { data: products } = await productQuery

  let slugs = (products ?? []).map((p) => p.slug as string)

  // Optional price filter
  if (body.maxPrice != null && slugs.length > 0) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, price, products!inner(slug)')
      .lte('price', body.maxPrice)
      .in('products.slug', slugs)

    const cheapBySlug = new Set<string>()
    for (const o of offers ?? []) {
      const prod = (o as { products: { slug: string } | { slug: string }[] }).products
      const slug = Array.isArray(prod) ? prod[0]?.slug : prod?.slug
      if (slug) cheapBySlug.add(slug)
    }
    slugs = slugs.filter((s) => cheapBySlug.has(s))
  }

  // Return top 12 by score
  const sorted = (products ?? [])
    .filter((p) => slugs.includes(p.slug as string))
    .sort((a, b) => ((b.olivator_score as number) ?? 0) - ((a.olivator_score as number) ?? 0))
    .slice(0, 12)
    .map((p) => p.slug as string)

  // How many active products have any flavor_labels (for descriptive text)
  const { count: totalWithLabels } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('flavor_labels', 'eq', '{}')

  return NextResponse.json({ count: slugs.length, slugs: sorted, totalWithLabels: totalWithLabels ?? 0 })
}
