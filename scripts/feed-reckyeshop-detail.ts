/**
 * Reckyeshop feed analýza — kolik olivových olejů, EAN shoda s DB
 */
import { createClient } from '@supabase/supabase-js'
import https from 'https'
import { parseHeurekaXml, isOliveOil } from '../lib/heureka-feed-parser'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
const URL = 'https://www.reckyeshop.cz/heureka/export/products.xml'

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'OlivatorBot/1.0' } }, (res) => {
      let data = ''; res.on('data', (c) => { data += c }); res.on('end', () => resolve(data))
    })
    req.on('error', reject); req.setTimeout(25000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function main() {
  const xml = await fetchUrl(URL)
  const items = parseHeurekaXml(xml)
  const oils = items.filter(isOliveOil)

  console.log(`Celkem položek v feedu: ${items.length}`)
  console.log(`Olivové oleje (isOliveOil filter): ${oils.length}`)
  console.log()

  // EAN shoda s DB
  const eans = oils.map(o => o.ean).filter(Boolean) as string[]
  const { data: dbProducts } = await s
    .from('products')
    .select('ean, slug, name, status')
    .in('ean', eans)

  const matchedEans = new Set((dbProducts ?? []).map(p => p.ean))

  let matched = 0, newItems = 0, noEan = 0
  for (const oil of oils) {
    if (!oil.ean) { noEan++; continue }
    if (matchedEans.has(oil.ean)) matched++
    else newItems++
  }

  console.log(`EAN shoda s DB: ${matched} (budou updated)`)
  console.log(`Nové produkty (EAN v DB chybí): ${newItems} (budou draft)`)
  console.log(`Bez EAN: ${noEan}`)
  console.log()

  // Ukázka prvních 10 olejů
  console.log('Prvních 10 olivových olejů z feedu:')
  for (const oil of oils.slice(0, 10)) {
    const inDb = oil.ean && matchedEans.has(oil.ean) ? '✅DB' : '🆕'
    console.log(`  ${inDb} ${oil.productName.slice(0, 60)} | EAN:${oil.ean ?? 'N/A'} | ${oil.priceVat} Kč`)
  }

  // Stávající Reckyeshop nabídky v DB
  const { data: rRetailer } = await s.from('retailers').select('id').eq('slug', 'reckyeshop').single()
  const { data: existing } = await s
    .from('product_offers')
    .select('price, affiliate_url, product_url, products(ean, slug)')
    .eq('retailer_id', rRetailer?.id)
    .limit(10)

  console.log(`\nStávající nabídky Reckyeshop v DB: ${existing?.length ?? 0}`)
  for (const o of existing ?? []) {
    const p = o.products as any
    const hasAff = o.affiliate_url ? '✅' : '❌ NULL'
    console.log(`  ${hasAff} ${p?.slug ?? '?'} | EAN:${p?.ean ?? 'N/A'} | ${o.price} Kč`)
  }
}
main().catch(console.error)
