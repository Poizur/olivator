import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  // Top active products overall (for nejlepsi-2026)
  const { data: topActive } = await supabase
    .from('products')
    .select('slug, name, olivator_score, origin_country, volume_ml, acidity, polyphenols, certifications')
    .eq('status', 'active')
    .not('name', 'ilike', '%(poškozený obal)%')
    .order('olivator_score', { ascending: false, nullsFirst: false })
    .limit(20)

  console.log('\n=== TOP 20 ACTIVE PRODUCTS (for nejlepsi-2026 replacements) ===')
  topActive?.forEach(p => {
    const certs = (p.certifications as string[] ?? []).join(', ')
    console.log(`  [${p.olivator_score}] ${p.origin_country} ${p.volume_ml}ml — "${p.name?.slice(0, 55)}"`)
    console.log(`    slug: ${p.slug}`)
    console.log(`    acidity: ${p.acidity}% | poly: ${p.polyphenols}mg/kg | certs: ${certs}`)
  })

  // Budget active products (for do-200-kc - looking for affordable ones)
  // Need to join with product_offers to find prices
  const { data: withOffers } = await supabase
    .from('product_offers')
    .select('product_id, price, products!inner(slug, name, olivator_score, origin_country, volume_ml, status)')
    .eq('products.status', 'active')
    .gt('price', 0)
    .lte('price', 350)  // offers under 350 CZK (could be 250ml small bottles under 200)
    .order('price')
    .limit(30)

  console.log('\n\n=== BUDGET ACTIVE PRODUCTS with offers ≤350 Kč (for do-200-kc replacements) ===')
  const seen = new Set<string>()
  withOffers?.forEach((o: any) => {
    const p = o.products
    if (!p || seen.has(p.slug)) return
    seen.add(p.slug)
    console.log(`  ${p.volume_ml}ml [Score ${p.olivator_score}] ${p.origin_country} — "${p.name?.slice(0, 55)}" — offer: ${o.price} Kč`)
    console.log(`    slug: ${p.slug}`)
  })
}

main()
