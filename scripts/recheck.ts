import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('products').select('id, slug, name, brand_slug, image_url').eq('id', 'f687d2b3-a022-4f40-a3eb-af4b576e57cf').maybeSingle()
  console.log('Product f687d2b3:', data)

  // Find products with "casa" or "mainova" in slug
  const { data: similar } = await supabaseAdmin.from('products').select('id, slug, name, brand_slug').or('slug.ilike.%casa%,slug.ilike.%mainova%').limit(10)
  console.log('\nSimilar slugs:')
  ;(similar ?? []).forEach((p: { id: string; slug: string; name: string }) =>
    console.log(`  ${p.id.slice(0,8)} ${p.slug.padEnd(60)} | ${p.name.slice(0, 60)}`)
  )
}
main().catch(console.error)
