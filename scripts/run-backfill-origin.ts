import { supabaseAdmin as supabase } from '../lib/supabase'

function inferOriginFromText(text: string): { country: string | null } {
  const t = text.toLowerCase()
  // Greece
  if (/\b(řeck|greek|greece|kalamata|kréta|crete|pelopon|sparta|sitia|laconia|messenia|korfu|lesbos|mytilene|rhodian|kythira|liophos|stamatakos|manaki|koroneiki|mytilini|laconic|lakonia|messinia|attica|attika|thassian|thasos|limnos|knossos|heraklion)\b/.test(t)) return { country: 'GR' }
  // Italy
  if (/\b(itál|italian|italy|toskán|tuscany|sicílie|sicilia|sicily|puglia|calabria|ligurie|liguria|umbrie|umbria|sardinie|sardinia|campania|abruzzo|apulia|molise|basilicata|frantoio|cutrera|monini|barbera|ravida|colonna|terre|biancolilla|nocellara|moraiolo|taggiasca|leccino|coratina|ogliarola)\b/.test(t)) return { country: 'IT' }
  // Spain
  if (/\b(španěl|spanish|spain|españa|andalusie|andalusia|aragón|aragon|catalonia|katalánsko|jaén|cordoba|sevilla|arbequina|picual|hojiblanca|manzanilla|picudo|empeltre|lerida|nunez|castillo|oro|baena|priego|sierra|magina)\b/.test(t)) return { country: 'ES' }
  // Croatia
  if (/\b(chorvatsk|croatia|istria|istrie|dalmatia|dalmácie|dubrovnik|istra|zadar|split)\b/.test(t)) return { country: 'HR' }
  // Portugal
  if (/\b(portugal|portugalsk|alentejo|douro|trás|minho|galega|cobrancosa|madural|verdeal|cordovil)\b/.test(t)) return { country: 'PT' }
  // Turkey
  if (/\b(turecko|turkish|turkey|türk|aegean|izmir|ayvalik|gemlik|memecik)\b/.test(t)) return { country: 'TR' }
  // Morocco
  if (/\b(maroko|morocc|marrakech|fez|picholine marocaine|haouzia|menara)\b/.test(t)) return { country: 'MA' }
  // Tunisia
  if (/\b(tunisko|tunisia|tunisian|chemlali|chetoui|oueslati|zalmati)\b/.test(t)) return { country: 'TN' }
  // Israel
  if (/\b(izrael|israel|israeli|souri|barnea|rumi|galilee)\b/.test(t)) return { country: 'IL' }
  return { country: null }
}

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description_short, description_long')
    .is('origin_country', null)
    .limit(1000)

  if (error) { console.error(error); process.exit(1) }
  if (!products?.length) { console.log('Vše již vyplněno'); return }

  console.log(`Zpracovávám ${products.length} produktů bez vlajky...`)
  let filled = 0, skipped = 0

  for (const p of products) {
    const text = [p.name, p.description_short, p.description_long].filter(Boolean).join(' ')
    const { country } = inferOriginFromText(text)
    if (!country) { skipped++; continue }

    const { error: e } = await supabase.from('products').update({ origin_country: country }).eq('id', p.id)
    if (e) console.error(`Chyba pro ${p.name}:`, e.message)
    else { filled++; console.log(`  ✓ ${country}  ${p.name.slice(0, 60)}`) }
  }

  console.log(`\nHotovo: doplněno ${filled}, nelze odhadnout ${skipped}`)
}
main().catch(console.error)
