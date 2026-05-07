import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('brands').select('slug, name, status').ilike('name', '%panensk%')
  console.log('Panenský matches:', data)
  // Also check products with name containing "panensky" but no brand_slug
  const { data: noBrand } = await supabaseAdmin.from('products').select('slug, name, brand_slug').is('brand_slug', null).limit(5)
  console.log('\nProducts bez brand_slug (sample 5):')
  ;(noBrand ?? []).forEach((p: { slug: string; name: string }) => console.log(`  • ${p.name.slice(0,60)} → slug: ${p.slug.slice(0,40)}`))
}
main().catch(console.error)
