/**
 * Nastaví Reckyeshop XML feed + buildne affiliate URLs pro všech 10 nabídek.
 * Krok 1: Uloží xml_feed_url + xml_feed_format do DB
 * Krok 2: Spustí syncRetailerFeed pro Reckyeshop (ceny z feedu)
 * Krok 3: Buildne affiliate_url ze šablony pro všechny nabídky bez affiliate
 */
import { createClient } from '@supabase/supabase-js'
import { syncRetailerFeed } from '../lib/feed-sync'
import https from 'https'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

function buildAffiliateUrl(template: string, productSlug: string, productUrl: string): string {
  return template
    .replace('{product_slug}', encodeURIComponent(productSlug))
    .replace('{product_url}', encodeURIComponent(productUrl))
}

async function verifyUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : require('http')
    const req = mod.request(url, { method: 'HEAD', headers: { 'User-Agent': 'OlivatorBot/1.0' } }, (res: any) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(8000, () => { req.destroy(); resolve(false) })
    req.end()
  })
}

async function main() {
  const FEED_URL = 'https://www.reckyeshop.cz/heureka/export/products.xml'

  // ── KROK 1: Uložit feed URL ─────────────────────────────────────────────
  console.log('KROK 1: Ukladám xml_feed_url pro Reckyeshop...')
  const { data: retailer, error: rErr } = await s
    .from('retailers')
    .update({
      xml_feed_url: FEED_URL,
      xml_feed_format: 'heureka',
    })
    .eq('slug', 'reckyeshop')
    .select('id, name, slug, base_tracking_url')
    .single()

  if (rErr) { console.error('❌ Update failed:', rErr.message); process.exit(1) }
  console.log(`✅ xml_feed_url uložen pro ${retailer!.name}`)
  console.log(`   base_tracking_url: ${String(retailer!.base_tracking_url).slice(0, 80)}`)
  console.log()

  // ── KROK 2: Feed sync ───────────────────────────────────────────────────
  console.log('KROK 2: Feed sync Reckyeshop...')
  try {
    const result = await syncRetailerFeed(retailer!.id as string)
    console.log(`✅ Feed sync hotov:`)
    console.log(`   oilsInFeed: ${result.oilsInFeed}`)
    console.log(`   offersUpserted: ${result.offersUpserted}`)
    console.log(`   productsCreated: ${result.productsCreated}`)
    console.log(`   productsExisting: ${result.productsExisting}`)
    console.log(`   errors: ${result.errors.length}`)
    if (result.errors.length > 0) result.errors.slice(0, 3).forEach(e => console.log(`   ERR: ${e}`))
  } catch (e: any) {
    console.error('❌ Feed sync failed:', e.message)
  }
  console.log()

  // ── KROK 3: Affiliate URLs pro všechny nabídky bez affiliate ───────────
  console.log('KROK 3: Builduju affiliate URLs pro Reckyeshop nabídky...')
  const template = retailer!.base_tracking_url as string

  const { data: offers } = await s
    .from('product_offers')
    .select('id, product_url, products!inner(slug)')
    .eq('retailer_id', retailer!.id)
    .is('affiliate_url', null)
    .not('product_url', 'is', null)

  console.log(`Nabídek bez affiliate_url: ${offers?.length ?? 0}`)

  let applied = 0, skipped = 0, failed = 0
  for (const offer of offers ?? []) {
    const productSlug = (offer.products as any)?.slug as string
    const productUrl = offer.product_url as string

    if (!productSlug || !productUrl) { skipped++; continue }

    // HTTP verify
    const ok = await verifyUrl(productUrl)
    if (!ok) {
      console.log(`  SKIP (404/timeout): ${productUrl.slice(0, 70)}`)
      skipped++
      continue
    }

    const affiliateUrl = buildAffiliateUrl(template, productSlug, productUrl)
    const { error } = await s
      .from('product_offers')
      .update({ affiliate_url: affiliateUrl })
      .eq('id', offer.id)

    if (error) { console.log(`  ERR ${productSlug}: ${error.message}`); failed++; continue }

    console.log(`  ✅ ${productSlug}`)
    console.log(`     → ${affiliateUrl.slice(0, 100)}`)
    applied++
  }

  console.log(`\nAffiliates: ${applied} nastaveno | ${skipped} přeskočeno | ${failed} chyb`)

  // ── FINÁLNÍ REPORT ─────────────────────────────────────────────────────
  console.log('\n═══ FINÁLNÍ STAV RECKYESHOP ═══')
  const { data: finalOffers } = await s
    .from('product_offers')
    .select('price, affiliate_url, last_checked, products!inner(slug)')
    .eq('retailer_id', retailer!.id)
    .order('last_checked', { ascending: false })

  for (const o of finalOffers ?? []) {
    const hasAff = o.affiliate_url ? '✅' : '❌'
    const p = (o.products as any)?.slug as string
    console.log(`  ${hasAff} ${p} | ${o.price} Kč | checked: ${o.last_checked?.slice(0, 10)}`)
  }
}
main().catch(console.error)
