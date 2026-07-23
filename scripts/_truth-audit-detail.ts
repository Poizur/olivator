import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function getArticle(slug: string) {
  const { data } = await supabase.from('articles').select('slug, body_markdown').eq('slug', slug).single()
  return data
}

async function getProduct(slug: string) {
  const { data } = await supabase.from('products')
    .select('slug, olivator_score, acidity, polyphenols, score_breakdown')
    .eq('slug', slug).single()
  return data
}

// Get current best price for product
async function getMinPrice(productSlug: string) {
  const { data: prod } = await supabase.from('products').select('id').eq('slug', productSlug).single()
  if (!prod) return null
  const { data } = await supabase.from('product_offers')
    .select('price, retailer_id')
    .eq('product_id', prod.id)
    .eq('in_stock', true)
    .order('price')
    .limit(1)
  return data?.[0]?.price ?? null
}

async function main() {
  // 1. Check "30+ zemí" claim in dop-pgi-bio-certifikace
  const dop = await getArticle('dop-pgi-bio-certifikace')
  const dopZeme = (dop?.body_markdown ?? '').match(/.{0,50}30\+?\s*zem.{0,80}/gi)
  console.log('=== dop-pgi-bio-certifikace: "30+ zemí" kontext ===')
  dopZeme?.forEach(m => console.log(`  "${m}"`))

  // 2. Check "200 olejů" "400 olejů" in dop article (likely educational)
  const dopOleje = (dop?.body_markdown ?? '').match(/.{0,80}(200|400)\s*olejů.{0,80}/gi)
  console.log('\n=== dop: "200/400 olejů" kontext ===')
  dopOleje?.forEach(m => console.log(`  "${m}"`))

  // 3. Check "439 olejů" in jak-vybrat and nejlepsi-2026
  const jv = await getArticle('jak-vybrat-olivovy-olej')
  const jv439 = (jv?.body_markdown ?? '').match(/.{0,80}439.{0,80}/gi)
  console.log('\n=== jak-vybrat-olivovy-olej: "439" kontext ===')
  jv439?.forEach(m => console.log(`  "${m}"`))

  const best = await getArticle('nejlepsi-olivovy-olej-2026')
  const best439 = (best?.body_markdown ?? '').match(/.{0,80}439.{0,80}/gi)
  console.log('\n=== nejlepsi-olivovy-olej-2026: "439" kontext ===')
  best439?.forEach(m => console.log(`  "${m}"`))

  // 4. Verify specific product scores referenced inline
  // premium-olivovy-olej-ma-smysl mentions Score 84, 87, 89 — which products?
  const premium = await getArticle('premium-olivovy-olej-ma-smysl')
  const premiumScores = (premium?.body_markdown ?? '').match(/.{0,100}\(Score\s+\d+\).{0,100}/gi)
  console.log('\n=== premium-olivovy-olej-ma-smysl: Score kontext ===')
  premiumScores?.forEach(m => console.log(`  "${m}"`))

  // 5. Check "250 mg/kg polyfenol" references — polyfenoly threshold claim
  const poly = await getArticle('je-olivovy-olej-zdravy')
  const poly250 = (poly?.body_markdown ?? '').match(/.{0,80}250\s*mg.{0,80}/gi)
  console.log('\n=== je-olivovy-olej-zdravy: "250 mg/kg" kontext ===')
  poly250?.forEach(m => console.log(`  "${m}"`))

  // 6. Check inline score claims in jak-vybrat
  const jvScores = (jv?.body_markdown ?? '').match(/.{0,100}\(Score\s+\d+\).{0,100}/gi)
  console.log('\n=== jak-vybrat-olivovy-olej: inline Scores ===')
  jvScores?.forEach(m => console.log(`  "${m}"`))

  // Verify those products from DB
  const productsToCheck = [
    'evolia-platinum-2000-bio-extra-panensky-olivovy-olej-500ml',
    'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l',
    'intini-coratina-alberobello-extra-panensky-olivovy-olej-750ml',
  ]
  console.log('\n=== DB scores for key products ===')
  for (const slug of productsToCheck) {
    const p = await getProduct(slug)
    const price = await getMinPrice(slug)
    if (p) {
      console.log(`  ${slug}: score=${p.olivator_score}, acidity=${p.acidity}, poly=${p.polyphenols}, best_price=${price}`)
    } else {
      console.log(`  ${slug}: NOT FOUND in DB`)
    }
  }
  
  // 7. rankings with specific prices in meta — check if products still exist
  const { data: rankings } = await supabase.from('rankings')
    .select('slug, meta_description, product_slugs')
    .eq('status', 'active')
    .not('meta_description', 'is', null)
  
  console.log('\n=== Rankings winner + meta claims ===')
  for (const r of rankings ?? []) {
    const winnerSlug = r.product_slugs?.[0]
    if (!winnerSlug) continue
    const p = await getProduct(winnerSlug)
    const price = await getMinPrice(winnerSlug)
    const priceInMeta = r.meta_description?.match(/od\s+(\d+)\s*Kč/)
    if (priceInMeta && price) {
      const metaPrice = parseInt(priceInMeta[1])
      const diff = Math.abs(metaPrice - (price ?? 0))
      const status = diff > 200 ? '❌ VELKÝ ROZDÍL' : diff > 50 ? '⚠️ ROZDÍL' : '✓ OK'
      console.log(`  ${r.slug}: meta="${metaPrice}Kč", live="${price}Kč" → ${status}`)
    } else if (priceInMeta && !price) {
      console.log(`  ${r.slug}: meta="${priceInMeta[1]}Kč", live=N/A (no in-stock offer)`)
    }
    if (p) {
      const scoreInMeta = r.meta_description?.match(/Score\s+(\d+)/)
      if (scoreInMeta && p.olivator_score) {
        const metaScore = parseInt(scoreInMeta[1])
        const status = metaScore !== p.olivator_score ? `❌ NESOUHLASÍ (DB=${p.olivator_score})` : '✓ OK'
        console.log(`    score: meta=${metaScore} → ${status}`)
      }
    } else if (winnerSlug) {
      console.log(`  ${r.slug}: winner "${winnerSlug}" NOT FOUND in DB ❌`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
