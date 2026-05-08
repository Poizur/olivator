import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { count: total } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active').like('image_url', '%images.unsplash.com%')
  console.log('Active produkty s Unsplash fallback obrázkem:', total)
  // Also check articles + recipes (které jsem image-backfilloval na Unsplash)
  const { count: art } = await supabaseAdmin.from('articles').select('*', { count: 'exact', head: true }).like('hero_image_url', '%images.unsplash.com%')
  const { count: rec } = await supabaseAdmin.from('recipes').select('*', { count: 'exact', head: true }).like('hero_image_url', '%images.unsplash.com%')
  const { count: ent } = await supabaseAdmin.from('entity_images').select('*', { count: 'exact', head: true }).like('url', '%images.unsplash.com%').eq('status', 'active')
  console.log('Articles s Unsplash hero:', art, '| Recipes:', rec, '| Entity images:', ent)
}
main().catch(console.error)
