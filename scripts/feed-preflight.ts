/**
 * Feed pre-flight + tracking ověření
 * Krok 1: porovnej a_bid v DB vs dodané
 * Krok 2: každý feed — validní XML? kolik položek? olivov? EAN?
 */
import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

const EXPECTED_BIDS: Record<string, string> = {
  reckyeshop:    'b44af70e',
  cretamart:     '0c6277d3',
  italyshop:     '12368485',
  reckonasbavi:  '46f8224d',
}

const FEEDS: Record<string, string> = {
  cretamart:    'https://cretamart.com/data-xml/modul-heureka/heureka-read.php?shop=1&type=productscz&token=5f760d1dc9',
  italyshop:    'https://www.italyshop.cz/heureka/export/products.xml',
  reckyeshop:   'https://www.reckyeshop.cz/heureka/export/products.xml',
  reckonasbavi: 'https://shop.reckonasbavi.cz/heureka/export/products.xml?hash=P2lRGhk8zvNODZhXU9Uw9ig',
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'OlivatorBot/1.0' } }, (res) => {
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

async function main() {
  // ─── KROK 1: Ověření a_bid v DB ───────────────────────────────────────────
  console.log('═══ KROK 1: OVĚŘENÍ a_bid v DB vs dodané ═══\n')
  const { data: retailers } = await s
    .from('retailers')
    .select('slug, name, base_tracking_url, xml_feed_url')
    .in('slug', ['reckonasbavi', 'italyshop', 'reckyeshop', 'cretamart'])

  let trackingMismatch = false
  for (const r of retailers ?? []) {
    const expectedBid = EXPECTED_BIDS[r.slug]
    const url = r.base_tracking_url as string | null
    const bidInDb = url ? (url.match(/a_bid=([a-f0-9]+)/)?.[1] ?? 'NENALEZEN') : 'NULL'
    const match = bidInDb === expectedBid
    if (!match) trackingMismatch = true
    const icon = match ? '✅' : '❌ MISMATCH!'
    console.log(`${icon} ${r.name}`)
    console.log(`   DB base_tracking_url: ${url?.slice(0, 80) ?? '(NULL)'}`)
    console.log(`   a_bid v DB:       ${bidInDb}`)
    console.log(`   a_bid dodané:     ${expectedBid}`)
    console.log(`   XML feed v DB:    ${r.xml_feed_url ?? '(NULL)'}`)
    console.log()
  }
  if (trackingMismatch) {
    console.log('⚠️  TRACKING MISMATCH NALEZEN — reportuji PŘED opravou (viz výše)\n')
  } else {
    console.log('✅ Tracking OK u všech v DB\n')
  }

  // ─── KROK 2: Pre-flight každého feedu ────────────────────────────────────
  console.log('═══ KROK 2: PRE-FLIGHT FEEDŮ ═══\n')

  for (const [slug, url] of Object.entries(FEEDS)) {
    console.log(`── ${slug} ──`)
    console.log(`   URL: ${url.slice(0, 80)}`)

    let xml: string
    try {
      xml = await fetchUrl(url)
    } catch (e: any) {
      console.log(`   ❌ FETCH FAILED: ${e.message}\n`)
      continue
    }

    const isXml = xml.trimStart().startsWith('<?xml') || xml.trimStart().startsWith('<SHOP') || xml.trimStart().startsWith('<shop')
    const totalItems = countMatches(xml, /<SHOPITEM>|<item>/gi)
    const olivovItems = countMatches(xml, /olivov/gi)
    const eanTags = countMatches(xml, /<EAN>|<ean>/gi)
    const priceTags = countMatches(xml, /<PRICE>|<price>/gi)
    const nameTags = countMatches(xml, /<NAME>|<name>|<PRODUCTNAME>/gi)
    const urlTags = countMatches(xml, /<URL>|<url>/gi)
    const availTags = countMatches(xml, /<AVAILABILITY>|<STOCK_QUANTITY>|<availability>/gi)

    console.log(`   Validní XML: ${isXml ? '✅' : '⚠️ (neznámá struktura)'}`)
    console.log(`   Celkem položek (<SHOPITEM>): ${totalItems}`)
    console.log(`   Výskyty "olivov": ${olivovItems}`)
    console.log(`   <EAN> tagy: ${eanTags}`)
    console.log(`   <PRICE> tagy: ${priceTags}`)
    console.log(`   <NAME> tagy: ${nameTags}`)
    console.log(`   <URL> tagy: ${urlTags}`)
    console.log(`   <AVAILABILITY> tagy: ${availTags}`)

    // První položka pro ověření struktury
    const firstItem = xml.match(/<SHOPITEM[^>]*>([\s\S]*?)<\/SHOPITEM>/i)
    if (firstItem) {
      const inner = firstItem[1].replace(/\s+/g, ' ').slice(0, 400)
      console.log(`   První item (preview): ${inner}`)
    }
    console.log()
  }
}
main().catch(console.error)
