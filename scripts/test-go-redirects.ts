/** Test /go/ redirectů pro všechny 4 eHUB partnery */
import { createClient } from '@supabase/supabase-js'
import https from 'https'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

function testGoUrl(path: string): Promise<{ status: number; location: string }> {
  const url = `https://olivator.cz${path}`
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'OlivatorBot/1.0' } }, (res) => {
      resolve({ status: res.statusCode ?? 0, location: (res.headers.location ?? '').slice(0, 100) })
    }).on('error', () => resolve({ status: 0, location: 'ERROR' }))
      .setTimeout(10000, function() { this.destroy(); resolve({ status: 0, location: 'TIMEOUT' }) })
  })
}

const PARTNERS = ['reckonasbavi', 'italyshop', 'reckyeshop', 'cretamart']
const BIDS: Record<string, string> = {
  reckonasbavi: '46f8224d', italyshop: '12368485', reckyeshop: 'b44af70e', cretamart: '0c6277d3',
}

async function main() {
  console.log('═══ /go/ REDIRECT TEST ═══\n')
  for (const retailerSlug of PARTNERS) {
    const { data: r } = await s.from('retailers').select('id, name').eq('slug', retailerSlug).single()
    const { data: offer } = await s
      .from('product_offers')
      .select('affiliate_url, products!inner(slug)')
      .eq('retailer_id', r!.id)
      .not('affiliate_url', 'is', null)
      .limit(1)
      .single()

    const productSlug = (offer?.products as any)?.slug as string
    const goPath = `/go/${retailerSlug}/${productSlug}`
    const res = await testGoUrl(goPath)

    const expectedBid = BIDS[retailerSlug]
    const bidInRedirect = res.location.match(/a_bid=([a-f0-9]+)/)?.[1] ?? '?'
    const bidOk = bidInRedirect === expectedBid
    const icon = res.status === 302 && bidOk ? '✅' : '❌'

    console.log(`${icon} ${r!.name}`)
    console.log(`   GET ${goPath}`)
    console.log(`   Status: ${res.status} | a_bid: ${bidInRedirect} (očekáváno: ${expectedBid}) ${bidOk ? '✅' : '❌'}`)
    console.log(`   Location: ${res.location}`)
    console.log()
  }
}
main().catch(console.error)
