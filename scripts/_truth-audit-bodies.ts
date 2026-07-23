// Truth audit — Layer 1 extended: výtah tvrzení z article bodies
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, title, body_markdown, meta_description, meta_title')
    .eq('status', 'active')
    .order('slug')

  const { data: rankings } = await supabase
    .from('rankings')
    .select('slug, title, description, meta_description')
    .eq('status', 'active')
    .order('slug')

  // Patterns to search for
  const numericPatterns = [
    /(\d+)\+?\s*(prodejc|obchod|eshop)/gi,
    /(\d+)\+?\s*(olejů|produkt|výrobků)/gi,
    /(\d+)\+?\s*(zem[íi]|origin|countr)/gi,
    /(\d+)\+?\s*(značek|brand)/gi,
    /(\d+)\+?\s*(recenz|hodnocen)/gi,
    /([0-9,\.]+)\s*%\s*(kyselost|acidity)/gi,
    /polyfenol[ůy]\s+([0-9]+)\s*(mg|mikro)/gi,
    /([0-9]+)\s*mg\/kg/gi,
    /score\s+([0-9]+)/gi,
    /([0-9]+)\s*Kč/gi,
    /od\s+([0-9]+)\s*Kč/gi,
    /denně|24.hodin|každé\s+ráno/gi,
    /1×\s*měsíčně|1x\s*týdně|každý\s+týden/gi,
  ]

  console.log('=== TVRZENÍ V ARTICLE BODIES ===\n')
  
  for (const a of articles ?? []) {
    const body = a.body_markdown ?? ''
    const matches: string[] = []
    
    // Search for numeric claims about retailers/products
    const retailerClaims = [...body.matchAll(/(\d+)\+?\s*(prodejc|obchod|eshop)/gi)]
    const productClaims = [...body.matchAll(/(\d+)\+?\s*(olejů|produkt|výrobků)/gi)]
    const scoresClaims = [...body.matchAll(/\bScore\s+(\d+)\b/gi)]
    const priceClaims = [...body.matchAll(/\bod\s+(\d[\s\d]*)\s*Kč\b/g)]
    const polyClaims = [...body.matchAll(/(\d+)\s*mg\/kg/gi)]
    const acidClaims = [...body.matchAll(/(0,\d+)\s*%\s*(kyselost|acidity|acid)/gi)]
    const ctyClaims = [...body.matchAll(/(\d+)\+?\s*(zem[íi]|country|countr)/gi)]
    const brandClaims = [...body.matchAll(/(\d+)\+?\s*(značek|brand)/gi)]
    
    if (retailerClaims.length > 0) matches.push(`PRODEJCI: ${retailerClaims.map(m => m[0]).join(', ')}`)
    if (productClaims.length > 0) matches.push(`PRODUKTY: ${productClaims.map(m => m[0]).join(', ')}`)
    if (ctyClaims.length > 0) matches.push(`ZEMĚ: ${ctyClaims.map(m => m[0]).join(', ')}`)
    if (brandClaims.length > 0) matches.push(`ZNAČKY: ${brandClaims.map(m => m[0]).join(', ')}`)
    
    // Check inline product claims that might conflict with {{product:}} token
    const inlineScores = [...body.matchAll(/\(Score\s+(\d+)\)/gi)]
    const inlinePoly = [...body.matchAll(/(\d+)\s*mg\/kg\s*polyfenol/gi)]
    const inlineAcid = [...body.matchAll(/kyselost\s+(0[,\.]\d+)\s*%/gi)]
    const inlinePrice = [...body.matchAll(/od\s+(\d+)\s*Kč/gi)]
    
    if (inlineScores.length > 0) matches.push(`INLINE_SCORE: ${inlineScores.map(m => `${m[0]}`).join(', ')}`)
    if (inlinePoly.length > 0) matches.push(`INLINE_POLY: ${inlinePoly.map(m => m[0]).join(', ')}`)
    if (inlineAcid.length > 0) matches.push(`INLINE_ACID: ${inlineAcid.map(m => m[0]).join(', ')}`)
    if (inlinePrice.length > 0) matches.push(`INLINE_PRICE: ${inlinePrice.map(m => m[0]).join(', ')}`)
    
    if (matches.length > 0) {
      console.log(`📄 ${a.slug}`)
      matches.forEach(m => console.log(`   ${m}`))
      console.log()
    }
  }

  console.log('=== META DESCRIPTIONS CLAIMS ===\n')
  for (const a of articles ?? []) {
    const desc = a.meta_description ?? ''
    const priceMatch = desc.match(/od\s+(\d+)\s*Kč/)
    const retailerMatch = desc.match(/(\d+)\+?\s*(prodejc|obchod)/)
    const productMatch = desc.match(/(\d+)\+?\s*(olejů|produkt)/)
    if (priceMatch || retailerMatch || productMatch) {
      console.log(`📄 ${a.slug}: "${desc.slice(0,120)}"`)
    }
  }
  
  console.log('\n=== RANKINGS META DESCRIPTIONS CLAIMS ===\n')
  for (const r of rankings ?? []) {
    const desc = r.meta_description ?? ''
    const priceMatch = desc.match(/od\s+(\d+)\s*Kč/)
    if (priceMatch) {
      console.log(`📋 ${r.slug}: "${desc.slice(0,120)}"`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
