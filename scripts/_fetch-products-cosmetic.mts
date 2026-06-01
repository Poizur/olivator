import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// Fetch active products — looking for:
// 1. BIO certified with reasonable price and decent polyphenols
// 2. Good polyphenols, affordable (not Evolia 2777 @ 1500 Kč)
// Query: active products, sorted by polyphenols DESC, with offers
const { data: products, error } = await sb
  .from('products')
  .select(`
    slug, name, polyphenols, acidity, olivator_score,
    certifications, origin_country, volume_ml,
    product_offers(price, retailer_id)
  `)
  .eq('status', 'active')
  .not('polyphenols', 'is', null)
  .gte('polyphenols', 200)
  .order('polyphenols', { ascending: false })
  .limit(50)

if (error || !products) { console.error(error); process.exit(1) }

// Filter: has offers, not Evolia 2777 (too expensive for cosmetic use)
const withOffers = products.filter(p =>
  p.product_offers && p.product_offers.length > 0 &&
  !p.slug.includes('2777')
)

// Calculate price per 100ml
const withPrice = withOffers.map(p => {
  const offers = p.product_offers as any[]
  const minPrice = Math.min(...offers.map((o: any) => o.price).filter(Boolean))
  const pricePer100 = p.volume_ml ? (minPrice / p.volume_ml * 100) : null
  return { ...p, minPrice, pricePer100 }
})

// Filter out very expensive (> 80 Kč/100ml — Evolia 2000 is ~56 Kč/100ml, that's fine)
// For cosmetic: ideally under 60 Kč/100ml
const affordable = withPrice.filter(p => !p.pricePer100 || p.pricePer100 < 70)

// Show top 20 by polyphenols
console.log('TOP BIO + affordable products by polyphenols:')
console.log('slug | poly | cert | price/100ml | vol | score')
console.log('─'.repeat(100))

const bio = affordable.filter(p => p.certifications?.includes('bio') || p.certifications?.includes('organic'))
const nonBio = affordable.filter(p => !p.certifications?.includes('bio') && !p.certifications?.includes('organic'))

console.log('\n=== BIO certified ===')
bio.slice(0, 15).forEach(p => {
  console.log(`${p.slug.padEnd(80)} poly:${String(p.polyphenols).padStart(4)} cert:[${(p.certifications||[]).join(',')}] ${p.pricePer100 ? p.pricePer100.toFixed(0)+'Kč/100ml' : 'no price'} ${p.volume_ml}ml score:${p.olivator_score}`)
})

console.log('\n=== Non-BIO (high poly, affordable) ===')
nonBio.slice(0, 10).forEach(p => {
  console.log(`${p.slug.padEnd(80)} poly:${String(p.polyphenols).padStart(4)} ${p.pricePer100 ? p.pricePer100.toFixed(0)+'Kč/100ml' : 'no price'} ${p.volume_ml}ml score:${p.olivator_score}`)
})
