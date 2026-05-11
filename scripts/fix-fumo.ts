import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Vytvoř Frantoio Muraglia brand
  const { data: existing } = await supabaseAdmin.from('brands').select('id').eq('slug', 'frantoio-muraglia').maybeSingle()
  if (!existing) {
    await supabaseAdmin.from('brands').insert({
      slug: 'frantoio-muraglia',
      name: 'Frantoio Muraglia',
      country_code: 'IT',
      status: 'draft',
    })
    console.log('✓ Vytvořen Frantoio Muraglia brand')
  }
  // Přemapuj produkty
  const { error: e1 } = await supabaseAdmin.from('products').update({ brand_slug: 'frantoio-muraglia' }).eq('brand_slug', 'fumo')
  if (!e1) console.log('✓ Products fumo → frantoio-muraglia')
  // Smaž fumo brand
  await supabaseAdmin.from('brands').delete().eq('slug', 'fumo')
  console.log('✓ fumo brand smazán')
}
main().catch(console.error)
