/** Feed audit — stav XML feedů pro aktivní retailery */
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  // 1. Retaileři + feed info
  const { data: retailers } = await s
    .from('retailers')
    .select('id, name, slug, domain, affiliate_network, xml_feed_url, xml_feed_format, is_active, market')
    .eq('is_active', true)
    .order('name')

  console.log(`\n═══ AKTIVNÍ RETAILEŘI (${retailers?.length}) ═══`)
  for (const r of retailers ?? []) {
    console.log(`\n${r.name}`)
    console.log(`  slug: ${r.slug}`)
    console.log(`  domain: ${r.domain}`)
    console.log(`  affiliate_network: ${r.affiliate_network ?? '—'}`)
    console.log(`  xml_feed_url: ${r.xml_feed_url ?? '(žádný)'}`)
    console.log(`  xml_feed_format: ${r.xml_feed_format ?? '—'}`)
    console.log(`  market: ${r.market}`)
  }

  // 2. Discovery sources — poslední sync
  const { data: sources } = await s
    .from('discovery_sources')
    .select('retailer_id, source_type, last_crawled_at, status, url')
    .order('last_crawled_at', { ascending: false })

  // Map retailer_id → sources
  const sourcesByRetailer: Record<string, typeof sources> = {}
  for (const src of sources ?? []) {
    if (!sourcesByRetailer[src.retailer_id]) sourcesByRetailer[src.retailer_id] = []
    sourcesByRetailer[src.retailer_id]!.push(src)
  }

  console.log(`\n\n═══ DISCOVERY SOURCES PER RETAILER ═══`)
  for (const r of retailers ?? []) {
    const srcs = sourcesByRetailer[r.id] ?? []
    if (srcs.length === 0) { console.log(`${r.name}: žádný discovery source`); continue }
    console.log(`\n${r.name}:`)
    for (const src of srcs.slice(0, 3)) {
      const lastCrawl = src.last_crawled_at ? new Date(src.last_crawled_at).toISOString().slice(0,10) : 'nikdy'
      console.log(`  [${src.source_type}] ${src.status} | posl. crawl: ${lastCrawl} | ${src.url?.slice(0,80)}`)
    }
  }

  // 3. Product_offers count per retailer
  const { data: offerCounts } = await s
    .from('product_offers')
    .select('retailer_id')
    .not('affiliate_url', 'is', null)

  const countByRetailer: Record<string, number> = {}
  for (const o of offerCounts ?? []) {
    countByRetailer[o.retailer_id] = (countByRetailer[o.retailer_id] ?? 0) + 1
  }

  console.log(`\n\n═══ SOUHRNÁ TABULKA ═══`)
  console.log('Retailer                      | Nabídky | Síť       | XML feed? | Format')
  console.log('------------------------------|---------|-----------|-----------|-------')
  for (const r of retailers ?? []) {
    const offers = countByRetailer[r.id] ?? 0
    const hasXml = r.xml_feed_url ? 'ANO' : 'NE '
    const network = (r.affiliate_network ?? '—').padEnd(9)
    const fmt = r.xml_feed_format ?? '—'
    console.log(`${r.name.slice(0,30).padEnd(30)} | ${String(offers).padStart(7)} | ${network} | ${hasXml}       | ${fmt}`)
  }
}
main().catch(console.error)
