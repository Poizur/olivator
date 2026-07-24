/**
 * Kompletní feed sync pro všechny 4 eHUB partnery + namátkový test cen.
 */
import { createClient } from '@supabase/supabase-js'
import { runFeedSyncForAllRetailers } from '../lib/feed-sync-runner'
import https from 'https'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function verifyGoRedirect(slug: string, retailerSlug: string): Promise<string> {
  const url = `https://olivator.cz/go/${retailerSlug}/${slug}`
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'OlivatorBot/1.0' } }, (res) => {
      const loc = res.headers.location ?? ''
      resolve(`HTTP ${res.statusCode} → ${loc.slice(0, 80)}`)
    }).on('error', (e) => resolve(`ERROR: ${e.message}`))
      .setTimeout(10000, function() { this.destroy(); resolve('TIMEOUT') })
  })
}

async function main() {
  console.log('═══ KOMPLETNÍ FEED SYNC ═══\n')
  const result = await runFeedSyncForAllRetailers()
  console.log(`Retailerů zpracováno: ${result.retailersChecked}`)
  console.log(`Synced: ${result.retailersSynced} | Failed: ${result.retailersFailed}`)
  console.log(`Offers upserted celkem: ${result.totalOffersUpserted}`)
  console.log()

  for (const r of result.perRetailer) {
    const icon = r.ok ? '✅' : '❌'
    const s2 = r.summary
    const str = s2
      ? `oilsInFeed=${s2.oilsInFeed} created=${s2.productsCreated} existing=${s2.productsExisting} upserted=${s2.offersUpserted}`
      : r.error ?? ''
    console.log(`${icon} ${r.name}: ${str}`)
  }

  // ── Namátkový test cen (3 per feed retailer) ─────────────────────────────
  console.log('\n═══ NAMÁTKOVÝ TEST CEN ═══')
  const eHUBSlugs = ['reckonasbavi', 'italyshop', 'reckyeshop']

  for (const slug of eHUBSlugs) {
    const { data: retailer } = await s.from('retailers').select('id, name').eq('slug', slug).single()
    const { data: offers } = await s
      .from('product_offers')
      .select('price, last_checked, affiliate_url, product_url, products!inner(slug, name)')
      .eq('retailer_id', retailer?.id)
      .eq('in_stock', true)
      .not('affiliate_url', 'is', null)
      .order('last_checked', { ascending: false })
      .limit(3)

    console.log(`\n${retailer?.name ?? slug}:`)
    for (const o of offers ?? []) {
      const p = (o.products as any)
      const affBid = (o.affiliate_url as string).match(/a_bid=([a-f0-9]+)/)?.[1] ?? '?'
      console.log(`  ${p.name.slice(0, 50)} | ${o.price} Kč | a_bid=${affBid} | checked: ${o.last_checked?.slice(0,10)}`)
    }
  }

  // ── Souhrnná tabulka ─────────────────────────────────────────────────────
  console.log('\n\n═══ SOUHRNNÁ TABULKA ═══')
  const allSlugs = ['reckonasbavi', 'italyshop', 'reckyeshop', 'cretamart']
  for (const retailerSlug of allSlugs) {
    const { data: r } = await s
      .from('retailers')
      .select('id, name, xml_feed_url, xml_feed_last_synced')
      .eq('slug', retailerSlug)
      .single()

    const { data: offerStats } = await s
      .from('product_offers')
      .select('id, affiliate_url')
      .eq('retailer_id', r!.id)

    const total = offerStats?.length ?? 0
    const withAff = offerStats?.filter(o => o.affiliate_url).length ?? 0
    const feed = r!.xml_feed_url ? '✅ ANO' : '❌ NE'
    const lastSync = r!.xml_feed_last_synced ? new Date(r!.xml_feed_last_synced).toISOString().slice(0, 10) : '—'

    console.log(`${r!.name}`)
    console.log(`  Feed:    ${feed} | poslední sync: ${lastSync}`)
    console.log(`  Nabídky: ${total} celkem | ${withAff} s affiliate_url | ${total - withAff} bez`)
    console.log()
  }
}
main().catch(console.error)
