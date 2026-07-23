import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  // Top premium products: high Score, in-stock offers at 800+ Kč/l (80+ Kč/100ml)
  // First get all active products with score, sorted by score desc
  const { data: products } = await supabase
    .from('products')
    .select('id, slug, name, olivator_score, acidity, polyphenols, certifications, origin_country, description_short')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .gte('olivator_score', 80)
    .order('olivator_score', { ascending: false })

  console.log('=== PREMIUM PRODUCTS WITH SCORE ≥ 80 + OFFERS ===\n')
  
  for (const p of products ?? []) {
    // Get cheapest in-stock offer
    const { data: offers } = await supabase
      .from('product_offers')
      .select('price, affiliate_url, retailer_id')
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .not('price', 'is', null)
      .order('price')
      .limit(3)

    if (!offers || offers.length === 0) continue

    const minPrice = offers[0].price
    const hasAffiliate = offers.some(o => o.affiliate_url)
    
    // Volume from slug — rough check (5l products have lower Kč/l)
    // Skip 5L bag-in-box for this calculation — they're not premium segment
    // Premium = 800+ Kč/l = ~80 Kč/100ml
    // For 5L: if price > 400 it's > 80Kč/100ml
    // For 500ml: if price > 40 it's > 80Kč/100ml  
    // For 1L: if price > 80 it's > 80Kč/100ml
    // ... Let's just print all and let human decide
    
    const affiliateFlag = hasAffiliate ? '✓ affiliate' : '— no affiliate'
    console.log(`Score ${p.olivator_score} | ${p.slug}`)
    console.log(`  Cena od: ${minPrice} Kč | ${affiliateFlag}`)
    console.log(`  Kyselost: ${p.acidity}% | Poly: ${p.polyphenols} mg/kg`)
    console.log(`  Cert: ${(p.certifications ?? []).join(', ') || 'none'} | Origin: ${p.origin_country}`)
    console.log()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
