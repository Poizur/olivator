/** Feed audit 4 — kdy a jak vznikly Cretamart nabídky */
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  // Cretamart retailer ID
  const { data: cretamart } = await s.from('retailers').select('id, name').eq('slug', 'cretamart').single()
  const { data: reckyeshop } = await s.from('retailers').select('id, name').eq('slug', 'reckyeshop').single()

  for (const r of [cretamart, reckyeshop]) {
    if (!r) continue
    const { data: offers } = await s
      .from('product_offers')
      .select('price, last_checked, affiliate_url, product_url, commission_pct')
      .eq('retailer_id', r.id)
      .order('last_checked', { ascending: false })
      .limit(5)

    console.log(`\n═══ ${r.name} ═══`)
    for (const o of offers ?? []) {
      console.log(`  last_checked: ${o.last_checked?.slice(0,16)}`)
      console.log(`  price: ${o.price}`)
      console.log(`  commission: ${o.commission_pct}%`)
      console.log(`  affiliate_url: ${o.affiliate_url ?? '(NULL)'}`)
      console.log(`  product_url: ${o.product_url?.slice(0,80) ?? '(NULL)'}`)
      console.log()
    }
  }

  // Zkontrolovat brand_auto_fill nebo discovery_sources
  const { data: sourcesCreta } = await s
    .from('discovery_sources')
    .select('*')
    .eq('retailer_id', cretamart?.id ?? '')

  console.log('Cretamart discovery_sources:', sourcesCreta?.length ?? 0, 'záznamů')
  if (sourcesCreta?.length) {
    for (const src of sourcesCreta) {
      console.log(' ', JSON.stringify(src))
    }
  }
}
main().catch(console.error)
