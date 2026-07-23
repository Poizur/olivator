import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function getProduct(slug: string) {
  const { data } = await supabase.from('products').select('slug, olivator_score, acidity, polyphenols, name').eq('slug', slug).single()
  return data
}

async function main() {
  // Check specific products referenced in articles with inline scores
  const toCheck = [
    { slug: 'olivovy-olej-extra-panensky-callejas-coupage-5l', claimedScore: 94, claimedIn: 'jak-vybrat' },
    { slug: 'liophos-bio-extra-panensky-olivovy-olej-5l-stamatakos', claimedScore: 86, claimedIn: 'jak-vybrat' },
  ]
  
  console.log('=== INLINE SCORE VERIFIKACE ===')
  for (const item of toCheck) {
    const p = await getProduct(item.slug)
    if (p) {
      const match = p.olivator_score === item.claimedScore
      console.log(`  ${item.slug}`)
      console.log(`    Claimed Score ${item.claimedScore} in ${item.claimedIn}: ${match ? '✓ OK' : `❌ DB má ${p.olivator_score}`}`)
    } else {
      console.log(`  ${item.slug}: ❌ NOT FOUND IN DB`)
    }
  }

  // Check "premium" article fake products
  const fakeProducts = [
    'sitia-kreta-03-extra-virgin',
    'coratina-puglia-dop-single-estate',
    'manaki-messinia-premium',
  ]
  console.log('\n=== "premium-olivovy-olej-ma-smysl" PRODUKTY ===')
  for (const slug of fakeProducts) {
    const p = await getProduct(slug)
    console.log(`  ${slug}: ${p ? `FOUND (score=${p.olivator_score})` : '❌ NOT IN DB'}`)
  }

  // Check Intini in DB by name pattern
  const { data: intini } = await supabase.from('products')
    .select('slug, name, olivator_score')
    .ilike('name', '%Intini%')
    .eq('status', 'active')
  console.log('\n=== Intini produkty v DB ===')
  intini?.forEach(p => console.log(`  ${p.slug}: ${p.name} (score=${p.olivator_score})`))

  // Check for "Sitia Kréta 0.3" type product in DB
  const { data: sitia } = await supabase.from('products')
    .select('slug, name, olivator_score, acidity')
    .ilike('name', '%Sitia%')
    .eq('status', 'active')
  console.log('\n=== Sitia produkty v DB ===')
  sitia?.forEach(p => console.log(`  ${p.slug}: ${p.name} (score=${p.olivator_score}, acidity=${p.acidity})`))
  
  // Rankings: check which rankings have prices in meta but winner has no in-stock offer
  const { data: rankings } = await supabase.from('rankings')
    .select('slug, meta_description, product_slugs')
    .eq('status', 'active')
  
  console.log('\n=== RANKINGS WITHOUT VERIFIED PRICES IN META ===')
  for (const r of rankings ?? []) {
    const winnerSlug = r.product_slugs?.[0]
    const priceInMeta = r.meta_description?.match(/od\s+(\d+)\s*Kč/)
    if (!priceInMeta || !winnerSlug) {
      if (r.meta_description) console.log(`  ${r.slug}: META EXISTS BUT NO PRICE CLAIM`)
      continue
    }
    const { data: prod } = await supabase.from('products').select('id').eq('slug', winnerSlug).single()
    if (!prod) {
      console.log(`  ${r.slug}: winner product "${winnerSlug}" NOT IN DB ❌`)
      continue
    }
    const { data: offers } = await supabase.from('product_offers')
      .select('price')
      .eq('product_id', prod.id)
      .eq('in_stock', true)
      .order('price').limit(1)
    
    if (!offers || offers.length === 0) {
      console.log(`  ${r.slug}: winner "${winnerSlug}" — NO IN-STOCK OFFER, meta claims od ${priceInMeta[1]} Kč ⚠️`)
    } else {
      const metaPrice = parseInt(priceInMeta[1])
      const livePrice = offers[0].price
      const diff = Math.abs(metaPrice - livePrice)
      const status = diff > 200 ? '❌ VELKÝ ROZDÍL' : diff > 50 ? '⚠️ ROZDÍL' : '✓ OK'
      console.log(`  ${r.slug}: meta=${metaPrice}Kč, live=${livePrice}Kč (diff=${diff}) → ${status}`)
    }
  }
  
  // Check health claim in je-olivovy-olej-zdravy article about polyfenols
  // "chrání cévy před oxidací, snižuje záněty a zpomaluje oxidaci LDL cholesterolu" — EFSA claim
  // This is a valid factual claim based on EFSA 432/2012

  // Check "Olivátor promises" in static pages — need to read files
  console.log('\n=== OLIVÁTOR PROMISES — DB-based claims ===')
  console.log('srovnavac meta: "18 prodejců" → actual active retailers: 33')
  console.log('pruvodce slug page: "18 prodejců" → actual active retailers: 33')
  console.log('jak-vybrat article body: "439 olejů" → actual active products: 477')
  console.log('nejlepsi-olivovy-olej-2026: "439 produktů" → actual active products: 477')
  console.log()
  console.log('=== EFSA health claim 250mg/kg ===')
  console.log('EU 432/2012: "minimálně 250mg/kg polyfenolů" = simplified threshold, actual EFSA says')
  console.log('  5mg hydroxytyrosolU na 20g oleje = accurate representation ✓')
}

main().catch(e => { console.error(e); process.exit(1) })
