// Truth audit — Layer 1: live DB counts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  // Active product count
  const { count: activeProducts } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active')
  
  // Active retailers
  const { count: activeRetailers } = await supabase.from('retailers').select('*', { count: 'exact', head: true }).eq('is_active', true)
  
  // Total retailers
  const { count: totalRetailers } = await supabase.from('retailers').select('*', { count: 'exact', head: true })
  
  // Products with score
  const { count: withScore } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active').not('olivator_score', 'is', null)
  
  // Products with offers
  const { count: withOffers } = await supabase.from('product_offers').select('*', { count: 'exact', head: true }).eq('in_stock', true)
  
  // Products with polyphenols
  const { count: withPolyphenols } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active').not('polyphenols', 'is', null)
  
  // Products with acidity
  const { count: withAcidity } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active').not('acidity', 'is', null)
  
  // Articles count
  const { count: totalArticles } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'active')
  
  // Rankings count
  const { count: totalRankings } = await supabase.from('rankings').select('*', { count: 'exact', head: true }).eq('status', 'active')
  
  // Countries represented
  const { data: origins } = await supabase.from('products').select('origin_country').eq('status', 'active').not('origin_country', 'is', null)
  const uniqueCountries = new Set(origins?.map(r => r.origin_country) ?? [])
  
  // Brands
  const { count: totalBrands } = await supabase.from('brands').select('*', { count: 'exact', head: true }).eq('status', 'active')

  // Active offers with affiliate
  const { count: affiliateOffers } = await supabase.from('product_offers').select('*', { count: 'exact', head: true }).not('affiliate_url', 'is', null)
  
  // Retailer names
  const { data: retailers } = await supabase.from('retailers').select('name, slug, is_active').order('name')

  console.log('=== LIVE DB COUNTS ===')
  console.log(`Active products: ${activeProducts}`)
  console.log(`Active retailers: ${activeRetailers}`)
  console.log(`Total retailers (incl. inactive): ${totalRetailers}`)
  console.log(`Products with Score: ${withScore}`)
  console.log(`In-stock offers: ${withOffers}`)
  console.log(`Affiliate offer URLs: ${affiliateOffers}`)
  console.log(`Products with polyphenols: ${withPolyphenols}`)
  console.log(`Products with acidity: ${withAcidity}`)
  console.log(`Active articles: ${totalArticles}`)
  console.log(`Active rankings: ${totalRankings}`)
  console.log(`Unique origin countries: ${uniqueCountries.size} (${[...uniqueCountries].sort().join(', ')})`)
  console.log(`Active brands: ${totalBrands}`)
  console.log()
  console.log('=== ACTIVE RETAILERS ===')
  retailers?.filter(r => r.is_active).forEach(r => console.log(`  ${r.name} (${r.slug})`))
  console.log()
  console.log('=== INACTIVE RETAILERS ===')
  retailers?.filter(r => !r.is_active).forEach(r => console.log(`  ${r.name} (${r.slug})`))
}

main().catch(e => { console.error(e); process.exit(1) })
