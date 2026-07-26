// PRÁVNÍ INVENTURA — Olivum. Pouze čtení, žádné změny.
// Spustit: npx tsx --env-file=.env.local scripts/_olivum-legal-audit.ts

import { supabaseAdmin } from '@/lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  console.log('=== OLIVUM LEGAL AUDIT ===', new Date().toISOString())

  // 1. Retailer info
  const { data: retailer } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .eq('slug', 'olivum')
    .maybeSingle()
  console.log('\n--- RETAILER ---')
  console.log(JSON.stringify(retailer, null, 2))

  // 2. Všechny offers od olivum
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select(`
      id,
      product_id,
      price,
      currency,
      in_stock,
      product_url,
      affiliate_url,
      commission_pct,
      last_checked,
      last_price_change,
      products(id, slug, name, name_short, status, olivator_score, acidity, polyphenols, origin_country, type,
               description_short, description_long, ai_generated_at, flavor_profile,
               certifications, created_at, updated_at)
    `)
    .eq('retailers.slug', 'olivum')
    .not('product_id', 'is', null)

  // Filtrace: načti retailer_id nejdřív
  const retailerId = retailer?.id
  if (!retailerId) {
    console.error('CHYBA: Olivum retailer nenalezen v DB!')
    process.exit(1)
  }

  const { data: offersFiltered, error: oErr } = await supabaseAdmin
    .from('product_offers')
    .select(`
      id,
      product_id,
      price,
      currency,
      in_stock,
      product_url,
      affiliate_url,
      commission_pct,
      last_checked,
      last_price_change
    `)
    .eq('retailer_id', retailerId)

  console.log(`\n--- OFFERS (celkem): ${offersFiltered?.length ?? 0} ---`)
  if (oErr) console.error('Chyba offers:', oErr.message)

  if (!offersFiltered?.length) {
    console.log('Žádné nabídky od olivum — inventura kompletní.')
    return
  }

  const productIds = [...new Set(offersFiltered.map(o => o.product_id))]
  console.log(`Unikátní produkt_id: ${productIds.length}`)

  // 3. Produkty
  const { data: products } = await supabaseAdmin
    .from('products')
    .select(`
      id, slug, name, name_short, status, olivator_score, acidity, polyphenols,
      origin_country, type, description_short, description_long,
      ai_generated_at, flavor_profile, certifications, use_cases,
      created_at, updated_at
    `)
    .in('id', productIds)

  const productMap = new Map(products?.map(p => [p.id, p]) ?? [])

  // 4. Kolik z nich má olivum jako jediného prodejce?
  const { data: allOffersForProducts } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, retailer_id')
    .in('product_id', productIds)
    .eq('in_stock', true)

  const retailerCountPerProduct = new Map<string, Set<string>>()
  for (const o of allOffersForProducts ?? []) {
    if (!retailerCountPerProduct.has(o.product_id)) {
      retailerCountPerProduct.set(o.product_id, new Set())
    }
    retailerCountPerProduct.get(o.product_id)!.add(o.retailer_id)
  }

  const soleOlivumProducts: string[] = []
  const multiRetailerProducts: string[] = []

  for (const pid of productIds) {
    const retailers = retailerCountPerProduct.get(pid)
    if (!retailers || retailers.size === 1) {
      soleOlivumProducts.push(pid)
    } else {
      multiRetailerProducts.push(pid)
    }
  }

  // 5. Fotky těchto produktů
  const { data: images } = await supabaseAdmin
    .from('product_images')
    .select('product_id, url, source, alt_text, is_primary, created_at')
    .in('product_id', productIds)

  const imagesByProduct = new Map<string, typeof images>()
  for (const img of images ?? []) {
    if (!imagesByProduct.has(img.product_id)) imagesByProduct.set(img.product_id, [])
    imagesByProduct.get(img.product_id)!.push(img)
  }

  // 6. Scoring: kolik má Score, kyselost, polyfenoly
  let hasScore = 0, hasAcidity = 0, hasPolyphenols = 0

  for (const pid of productIds) {
    const p = productMap.get(pid)
    if (!p) continue
    if (p.olivator_score !== null) hasScore++
    if (p.acidity !== null) hasAcidity++
    if (p.polyphenols !== null) hasPolyphenols++
  }

  // 7. Tabulka produktů
  console.log('\n--- TABULKA PRODUKTŮ ---')
  const rows: Array<Record<string, unknown>> = []

  for (const pid of productIds) {
    const p = productMap.get(pid)
    if (!p) continue

    const offer = offersFiltered.find(o => o.product_id === pid)
    const imgs = imagesByProduct.get(pid) ?? []
    const primaryImg = imgs.find(i => i.is_primary) ?? imgs[0] ?? null
    const retailers = retailerCountPerProduct.get(pid)
    const isSole = !retailers || retailers.size === 1

    // Určení zdroje popisu
    let descSource = 'N/A'
    if (p.description_long || p.description_short) {
      if (p.ai_generated_at) {
        descSource = `AI_GENERATED (${p.ai_generated_at?.slice(0, 10)})`
      } else {
        descSource = 'MANUAL/UNKNOWN'
      }
    }

    // Zdroj fotky
    let imgSource = 'žádná'
    if (primaryImg) {
      const url = primaryImg.url || ''
      const src = primaryImg.source || ''
      if (url.includes('olivum.cz')) imgSource = 'HOTLINK olivum.cz'
      else if (src === 'scraper') imgSource = `scraper (${url.slice(0, 60)})`
      else if (src === 'admin') imgSource = 'admin upload'
      else if (src === 'unsplash') imgSource = 'unsplash'
      else imgSource = `${src}: ${url.slice(0, 60)}`
    }

    rows.push({
      slug: p.slug,
      status: p.status,
      score: p.olivator_score,
      acidity: p.acidity,
      polyphenols: p.polyphenols,
      origin: p.origin_country,
      price: offer?.price,
      in_stock: offer?.in_stock,
      sole_retailer: isSole,
      retailer_count: retailers?.size ?? 1,
      img_source: imgSource,
      desc_source: descSource,
      ai_generated_at: p.ai_generated_at,
      created_at: p.created_at,
      product_url: offer?.product_url,
      affiliate_url: offer?.affiliate_url ?? '(none)',
    })
  }

  // Print tabulku
  for (const row of rows) {
    console.log(JSON.stringify(row))
  }

  // 8. Souhrn
  const summary = {
    generated_at: new Date().toISOString(),
    retailer: {
      id: retailer?.id,
      slug: retailer?.slug,
      name: retailer?.name,
      domain: retailer?.domain,
      affiliate_network: retailer?.affiliate_network,
      base_tracking_url: retailer?.base_tracking_url,
      default_commission_pct: retailer?.default_commission_pct,
      is_active: retailer?.is_active,
      market: retailer?.market,
    },
    totals: {
      total_offers: offersFiltered.length,
      unique_products: productIds.length,
      sole_retailer_products: soleOlivumProducts.length,
      multi_retailer_products: multiRetailerProducts.length,
      products_with_score: hasScore,
      products_with_acidity: hasAcidity,
      products_with_polyphenols: hasPolyphenols,
    },
    sole_retailer_slugs: soleOlivumProducts.map(pid => productMap.get(pid)?.slug ?? pid),
    all_products: rows,
  }

  // Ulož do docs/legal/
  const legalDir = path.join(process.cwd(), 'docs', 'legal', 'olivum-2026-07-24')
  fs.mkdirSync(legalDir, { recursive: true })

  const outPath = path.join(legalDir, 'db-audit-raw.json')
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))
  console.log(`\nUloženo: ${outPath}`)

  // Výtisk pro terminál
  console.log('\n=== SOUHRN ===')
  console.log(`Nabídky celkem: ${summary.totals.total_offers}`)
  console.log(`Unikátní produkty: ${summary.totals.unique_products}`)
  console.log(`Olivum = jediný prodejce: ${summary.totals.sole_retailer_products}`)
  console.log(`Olivum + další prodejci: ${summary.totals.multi_retailer_products}`)
  console.log(`Mají Score: ${summary.totals.products_with_score}`)
  console.log(`Mají kyselost: ${summary.totals.products_with_acidity}`)
  console.log(`Mají polyfenoly: ${summary.totals.products_with_polyphenols}`)
}

main().catch(e => { console.error(e); process.exit(1) })
