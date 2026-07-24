/** Feed audit 3 — raw xml_feed_last_result + offer details */
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  // Raw last result pro feed partnery
  const { data } = await s
    .from('retailers')
    .select('name, xml_feed_last_synced, xml_feed_last_result')
    .eq('is_active', true)
    .not('xml_feed_url', 'is', null)

  for (const r of data ?? []) {
    console.log(`\n═══ ${r.name} ═══`)
    console.log('last_synced:', r.xml_feed_last_synced)
    console.log('last_result:', JSON.stringify(r.xml_feed_last_result, null, 2))
  }

  // Offers s timestamp created_at pro eHUB partnery
  const { data: eHUBRetailers } = await s
    .from('retailers')
    .select('id, name')
    .eq('affiliate_network', 'eHUB')
    .eq('is_active', true)

  for (const r of eHUBRetailers ?? []) {
    const { data: offers } = await s
      .from('product_offers')
      .select('price, last_checked, affiliate_url')
      .eq('retailer_id', r.id)
      .order('last_checked', { ascending: false })
      .limit(3)

    console.log(`\n${r.name} — posl. 3 nabídky:`)
    for (const o of offers ?? []) {
      console.log(`  ${o.last_checked?.slice(0,16)} | ${o.price} Kč | ${o.affiliate_url?.slice(0,70)}`)
    }
  }
}
main().catch(console.error)
