import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  const slugs = [
    'sitia-premium-gold-sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-1-l-plech',
    'evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen',
    'intini-coratina-alberobello',
    'evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml',
    'corinto-pelopones-extra-panensky-olivovy-olej-manaki-0-3-5-l',
    'michalis-vasilakis-5l-recky-farmarsky-filtrovany-extra-panensky-olivovy-olej',
  ]
  
  for (const slug of slugs) {
    const { data: p } = await supabase.from('products')
      .select('slug, name, olivator_score, acidity, polyphenols, certifications, origin_country, volume_ml, type, description_short')
      .eq('slug', slug).single()
    
    const { data: offers } = await supabase.from('product_offers')
      .select('price, affiliate_url, in_stock')
      .eq('product_id', (await supabase.from('products').select('id').eq('slug', slug).single()).data?.id ?? '')
      .eq('in_stock', true)
      .order('price').limit(1)
    
    if (!p) continue
    const offer = offers?.[0]
    const pricePer100ml = offer && p.volume_ml ? (offer.price / p.volume_ml * 100).toFixed(0) : 'N/A'
    const pricePer1L = offer && p.volume_ml ? (offer.price / p.volume_ml * 1000).toFixed(0) : 'N/A'
    
    console.log(`--- ${slug} ---`)
    console.log(`Name: ${p.name}`)
    console.log(`Score: ${p.olivator_score} | Acidity: ${p.acidity}% | Poly: ${p.polyphenols} mg/kg`)
    console.log(`Volume: ${p.volume_ml} ml | Certs: ${(p.certifications ?? []).join(', ')} | Country: ${p.origin_country}`)
    console.log(`Price: ${offer?.price ?? 'N/A'} Kč | Per 100ml: ${pricePer100ml} Kč | Per 1L: ${pricePer1L} Kč`)
    console.log(`Affiliate: ${offer?.affiliate_url ? 'YES' : 'NO'}`)
    console.log()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
