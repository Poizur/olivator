import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  // Přesný slug z kontextu
  const slug = 'picual-250-ml-extra-panensky-olivovy-olej'
  const { data: p } = await sb.from('products')
    .select('id, slug, name, status, status_reason, olivator_score, type')
    .eq('slug', slug)
    .single()

  console.log('=== PRODUKT (přesný slug) ===')
  console.log(p ?? 'NOT FOUND')

  // Ověř stav ostatních tokenů v sekci
  const slugs = [
    'picual-500-ml-extra-panensky-olivovy-olej',
    'picual-500-ml-extra-panensky-nefiltrovany-olivovy-olej',
    'arbequina-500-ml',
    'premium-extra-panensky-olivovy-olej-kyselost-0-2-250-ml-vafis',
  ]
  const { data: others } = await sb.from('products')
    .select('slug, name, status, olivator_score')
    .in('slug', slugs)

  console.log('\n=== OSTATNÍ TOKENY V SEKCI ===')
  for (const o of others ?? []) {
    console.log(`  [${o.status}] ${o.slug} | score ${o.olivator_score}`)
  }

  // Nejlepší aktivní náhrada do 220 Kč, EVOO, 250ml objem
  const { data: offers } = await sb.from('product_offers')
    .select('product_id, price')
    .not('price', 'is', null)
    .lte('price', 220)
    .eq('in_stock', true)

  const cheapIds = [...new Set((offers ?? []).map(o => o.product_id as string))]
  const { data: best } = await sb.from('products')
    .select('id, slug, name, olivator_score, volume_ml, type, status')
    .in('id', cheapIds)
    .eq('status', 'active')
    .in('type', ['evoo', 'virgin'])
    .gte('volume_ml', 200)
    .lte('volume_ml', 750)
    .not('olivator_score', 'is', null)
    .order('olivator_score', { ascending: false })
    .limit(5)

  console.log('\n=== NEJLEPŠÍ NÁHRADA (active, 200-750ml, ≤220 Kč, EVOO) ===')
  for (const b of best ?? []) {
    const price = (offers ?? []).filter(o => o.product_id === b.id).map(o => o.price as number).sort()[0]
    console.log(`  [score ${b.olivator_score}] ${b.slug} | ${b.volume_ml}ml | ${price} Kč`)
  }
}
main().catch(console.error)
