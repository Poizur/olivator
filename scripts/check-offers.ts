import { supabaseAdmin } from '../lib/supabase'

async function main() {
  const { data: retailer } = await supabaseAdmin
    .from('retailers').select('id').eq('slug', 'reckonasbavi').single()
  const rid = retailer?.id as string

  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('price, in_stock, manual_override, availability_note, products!inner(slug, name, ean)')
    .eq('retailer_id', rid)
    .order('in_stock', { ascending: true })

  for (const o of offers ?? []) {
    const p = (o as any).products
    console.log(`${p.slug} | in_stock=${(o as any).in_stock} | price=${(o as any).price} | override=${(o as any).manual_override} | note="${(o as any).availability_note}"`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
