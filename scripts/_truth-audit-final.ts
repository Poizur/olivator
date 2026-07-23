import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  // Check premium article full text for product references
  const { data: premium } = await supabase.from('articles').select('body_markdown').eq('slug', 'premium-olivovy-olej-ma-smysl').single()
  const body = premium?.body_markdown ?? ''
  
  // Find all /olej/SLUG links
  const links = [...body.matchAll(/\/olej\/([a-z0-9\-]+)/g)].map(m => m[1])
  console.log('=== premium-olivovy-olej-ma-smysl: /olej/ links ===')
  for (const slug of links) {
    const { data: p } = await supabase.from('products').select('slug, olivator_score, name, status').eq('slug', slug).single()
    console.log(`  ${slug}: ${p ? `✓ (score=${p.olivator_score}, status=${p.status})` : '❌ NOT IN DB'}`)
  }
  
  // pokrutiny article — polyphenols claim
  const { data: pokr } = await supabase.from('articles').select('body_markdown').eq('slug', 'olivovy-olej-z-pokrutin').single()
  const pokrBody = pokr?.body_markdown ?? ''
  const pokrPoly = [...pokrBody.matchAll(/.{0,100}polyfenol.{0,100}/gi)]
  console.log('\n=== olivovy-olej-z-pokrutin: polyfenoly kontext ===')
  pokrPoly.forEach(m => console.log(`  "${m[0]}"`))
  
  // na-smazeni article — 600 mg/kg claim
  const { data: smazeni } = await supabase.from('articles').select('body_markdown').eq('slug', 'olivovy-olej-na-smazeni-bod-zakoureni').single()
  const smazeniBody = smazeni?.body_markdown ?? ''
  const smazeniPoly = [...smazeniBody.matchAll(/.{0,100}600.{0,100}/gi)]
  console.log('\n=== olivovy-olej-na-smazeni: 600mg/kg kontext ===')
  smazeniPoly.forEach(m => console.log(`  "${m[0]}"`))

  // vs-slunecnicovy article — 800 mg/kg claim
  const { data: sunf } = await supabase.from('articles').select('body_markdown').eq('slug', 'olivovy-olej-vs-slunecnicovy').single()
  const sunfBody = sunf?.body_markdown ?? ''
  const sunfPoly = [...sunfBody.matchAll(/.{0,100}800.{0,100}/gi)]
  console.log('\n=== olivovy-olej-vs-slunecnicovy: 800mg/kg kontext ===')
  sunfPoly.forEach(m => console.log(`  "${m[0]}"`))
  
  // Check the bio ranking winner
  const { data: bioRanking } = await supabase.from('rankings').select('product_slugs, meta_description').eq('slug', 'nejlepsi-bio-olivovy-olej').single()
  const bioWinner = bioRanking?.product_slugs?.[0]
  console.log(`\n=== nejlepsi-bio-olivovy-olej winner: "${bioWinner}" ===`)
  if (bioWinner) {
    const { data: bp } = await supabase.from('products').select('name, olivator_score, status').eq('slug', bioWinner).single()
    console.log(`  DB: ${bp ? `name="${bp.name}", score=${bp.olivator_score}, status=${bp.status}` : '❌ NOT FOUND'}`)
    console.log(`  Meta claims: "${bioRanking?.meta_description?.slice(0, 80)}"`)
  }
  
  // Check olivovy-olej-na-plet: what does it say about UV, opalování
  const { data: plet } = await supabase.from('articles').select('body_markdown').eq('slug', 'olivovy-olej-na-plet-a-vlasy').single()
  const pletBody = plet?.body_markdown ?? ''
  const uvSection = [...pletBody.matchAll(/.{0,60}(SPF|UV|opalování|sunscreen|protisluneční).{0,80}/gi)]
  console.log('\n=== olivovy-olej-na-plet-a-vlasy: UV/opalování claims ===')
  uvSection?.slice(0, 6).forEach(m => console.log(`  "${m[0]}"`))

  // Check je-olivovy-olej-zdravy health claims
  const { data: zdravy } = await supabase.from('articles').select('body_markdown').eq('slug', 'je-olivovy-olej-zdravy').single()
  const zdravyBody = zdravy?.body_markdown ?? ''
  // Look for cardiovascular, cancer, dementia claims
  const healthClaims = [...zdravyBody.matchAll(/.{0,60}(snižuje|chrání|zabraňuje|léčí|prevence|riziko|rakovi|Alzheim|demence|cholesterol).{0,80}/gi)]
  console.log('\n=== je-olivovy-olej-zdravy: zdravotní tvrzení (prvních 10) ===')
  healthClaims?.slice(0, 10).forEach(m => console.log(`  "${m[0]}"`))

  // Check how many products with score >= 90 exist (PDF cover claim "Score 95")
  const { data: topScores } = await supabase.from('products').select('slug, name, olivator_score').eq('status', 'active').gte('olivator_score', 90).order('olivator_score', { ascending: false })
  console.log('\n=== Produkty se Score ≥ 90 ===')
  topScores?.forEach(p => console.log(`  ${p.olivator_score}: ${p.slug}`))
}

main().catch(e => { console.error(e); process.exit(1) })
