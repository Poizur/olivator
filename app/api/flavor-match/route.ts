// Flavor match: returns count of products matching given flavor sliders + price.
// Used by FlavorSelector for live "X olejů odpovídá" feedback.
//
// POST body: { fruity?: number; bitter?: number; spicy?: number; mild?: number; maxPrice?: number }
// Returns: { count, slugs: string[] }

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface FlavorQuery {
  fruity?: number
  bitter?: number
  spicy?: number
  mild?: number
  maxPrice?: number
}

const FLAVOR_DIMS = ['fruity', 'bitter', 'spicy', 'mild'] as const

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as FlavorQuery

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('slug, flavor_profile, olivator_score')
    .eq('status', 'active')

  // Match score: how close is product flavor to query flavor?
  // For each requested dimension, compute distance |product[dim] - query[dim]|
  // Total score = average distance. Lower = better match. Tolerance: ≤25.
  const matches = (products ?? [])
    .map((p) => {
      const profile = (p.flavor_profile as Record<string, number>) ?? {}
      let totalDist = 0
      let dimensions = 0
      for (const dim of FLAVOR_DIMS) {
        const target = body[dim]
        if (target == null) continue
        const actual = profile[dim] ?? 50
        totalDist += Math.abs(actual - target)
        dimensions++
      }
      const avgDist = dimensions > 0 ? totalDist / dimensions : 0
      return { slug: p.slug, score: p.olivator_score, dist: avgDist }
    })
    .filter((m) => m.dist <= 25)

  // Optional price filter
  let filteredSlugs: string[] = matches.map((m) => m.slug)

  if (body.maxPrice != null && filteredSlugs.length > 0) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, price, products!inner(slug)')
      .lte('price', body.maxPrice)
      .in('products.slug', filteredSlugs)

    const cheapBySlug = new Set<string>()
    for (const o of offers ?? []) {
      const products = (o as { products: { slug: string } | { slug: string }[] }).products
      const slug = Array.isArray(products) ? products[0]?.slug : products?.slug
      if (slug) cheapBySlug.add(slug)
    }
    filteredSlugs = filteredSlugs.filter((s) => cheapBySlug.has(s))
  }

  // Sort by score desc, return top 12 slugs
  const topSlugs = matches
    .filter((m) => filteredSlugs.includes(m.slug))
    .sort((a, b) => b.score - a.score || a.dist - b.dist)
    .slice(0, 12)
    .map((m) => m.slug)

  return NextResponse.json({ count: filteredSlugs.length, slugs: topSlugs })
}
