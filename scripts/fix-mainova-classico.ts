import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Tento produkt je Mainova Clássico 500 ml (název + source_url sedí)
  // Slug zbyl špatný z mého dřívějšího pokusu opravit jako Casa dos Montes
  await supabaseAdmin.from('products').update({
    slug: 'mainova-classico-extra-panensky-olivovy-olej-500-ml',
    brand_slug: 'mainova',
    origin_country: 'PT',
    origin_region: 'Trás-os-Montes',
    image_url: null,  // image byl ze starého Casa dos Montes — refetch z source
    updated_at: new Date().toISOString(),
  }).eq('id', 'f687d2b3-a022-4f40-a3eb-af4b576e57cf')

  // Smaž stale Casa dos Montes images
  await supabaseAdmin.from('product_images').delete().eq('product_id', 'f687d2b3-a022-4f40-a3eb-af4b576e57cf')

  console.log('✓ Slug + brand opraven, stale images smazány')
  console.log('  Image se znovu naimportuje při dalším scraper runu z source_url')
}
main().catch(console.error)
