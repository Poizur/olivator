import { supabaseAdmin } from '@/lib/supabase'
import { getProductsBySlugs } from '@/lib/data'

async function main() {
  const { data: r } = await supabaseAdmin.from('rankings').select('product_slugs').eq('slug', 'nejlepsi-olivovy-olej-do-200-kc').maybeSingle()
  const slugs = (r as { product_slugs: string[] }).product_slugs
  console.log('Slugs from DB:', slugs.length)
  const products = await getProductsBySlugs(slugs)
  console.log('getProductsBySlugs returned:', products.length)
  console.log('First 3:', products.slice(0,3).map(p => ({ slug: p.slug, status: p.status })))
}
main().catch(console.error)
