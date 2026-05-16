import { supabaseAdmin } from '../lib/supabase'

async function main() {
  // 1. Počty produktů per země
  const { data: countries } = await supabaseAdmin
    .from('products')
    .select('origin_country')
    .eq('status', 'active')
    .in('origin_country', ['GR', 'ES', 'IT', 'HR', 'PT'])

  const counts: Record<string, number> = {}
  for (const r of countries ?? []) counts[r.origin_country] = (counts[r.origin_country] ?? 0) + 1
  console.log('Countries:', JSON.stringify(counts))

  // 2. Produkty s olivator_score (nutné pro TopByCountry)
  const { data: withScore } = await supabaseAdmin
    .from('products')
    .select('origin_country')
    .eq('status', 'active')
    .in('origin_country', ['GR', 'ES', 'IT', 'HR', 'PT'])
    .not('olivator_score', 'is', null)

  const scoreCounts: Record<string, number> = {}
  for (const r of withScore ?? []) scoreCounts[r.origin_country] = (scoreCounts[r.origin_country] ?? 0) + 1
  console.log('With score:', JSON.stringify(scoreCounts))

  // 3. Produkty s cheapest offer (nutné pro TopByCountry)
  const { data: withOffers } = await supabaseAdmin
    .from('products')
    .select('origin_country, product_offers!inner(price)')
    .eq('status', 'active')
    .in('origin_country', ['GR', 'ES', 'IT', 'HR', 'PT'])
    .not('olivator_score', 'is', null)
    .not('product_offers.price', 'is', null)

  const offerCounts: Record<string, number> = {}
  for (const r of withOffers ?? []) offerCounts[r.origin_country] = (offerCounts[r.origin_country] ?? 0) + 1
  console.log('With score + offer:', JSON.stringify(offerCounts))

  // 4. Top 5 produktů s nejvíce offers
  const { data: multiOffer } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, products!inner(slug, name, status)')
    .eq('products.status', 'active')
    .not('price', 'is', null)

  const offerMap: Record<string, { slug: string; name: string; count: number }> = {}
  for (const r of multiOffer ?? []) {
    const p = r.products as { slug: string; name: string }
    if (!offerMap[r.product_id]) offerMap[r.product_id] = { slug: p.slug, name: p.name, count: 0 }
    offerMap[r.product_id].count++
  }
  const top5 = Object.values(offerMap).sort((a, b) => b.count - a.count).slice(0, 5)
  console.log('Top 5 multi-offer:', JSON.stringify(top5, null, 2))
}
main().catch(console.error)
