import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // 1. Vytvoř brand "Casa dos Montes" (PT)
  const { data: existing } = await supabaseAdmin.from('brands').select('id').eq('slug', 'casa-dos-montes').maybeSingle()
  if (!existing) {
    await supabaseAdmin.from('brands').insert({
      slug: 'casa-dos-montes',
      name: 'Casa dos Montes',
      country_code: 'PT',
      status: 'draft',
    })
    console.log('✓ Vytvořen brand Casa dos Montes')
  }

  // 2. Update product — fix slug, brand_slug, vyčistit fake source_url
  const productId = 'f687d2b3-a022-4f40-a3eb-af4b576e57cf'
  await supabaseAdmin
    .from('products')
    .update({
      slug: 'casa-dos-montes-extra-panensky-olivovy-olej-750-ml',
      brand_slug: 'casa-dos-montes',
      source_url: null,
      origin_country: 'PT',
      origin_region: 'Trás-os-Montes',
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
  console.log('✓ Product opraven (slug + brand + region)')

  // 3. Smaž junk "Extra" brandy (adega, crasto) — místo toho přejmenuj na správné
  // Crasto = Quinta do Crasto (PT)
  // Adega = generic, asi Crasto Adega Velha?
  for (const slug of ['crasto', 'adega']) {
    const { data: b } = await supabaseAdmin.from('brands').select('id, name').eq('slug', slug).maybeSingle()
    if (!b) continue
    if ((b as { name: string }).name === 'Extra') {
      const newName = slug.charAt(0).toUpperCase() + slug.slice(1)
      await supabaseAdmin.from('brands').update({
        name: newName,
        country_code: 'PT',  // both Portuguese
        updated_at: new Date().toISOString(),
      }).eq('slug', slug)
      console.log(`✓ ${slug}: name "Extra" → "${newName}", country PT`)
    }
  }

  // Adega má 0 produktů — smaž jako prázdný stub
  const { data: adegaProducts } = await supabaseAdmin.from('products').select('id').eq('brand_slug', 'adega')
  if ((adegaProducts ?? []).length === 0) {
    await supabaseAdmin.from('brands').delete().eq('slug', 'adega')
    console.log('✓ Adega brand smazán (0 produktů)')
  }
}
main().catch(console.error)
