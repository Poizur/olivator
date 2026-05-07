import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  for (const slug of ['p-d-o', 'arbequina-picual', 'alfa', 'casa', 'mainovo']) {
    console.log(`\n── ${slug} ──`)
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('slug, name, status, origin_country, source_url')
      .eq('brand_slug', slug)
      .limit(10)
    const ps = (products ?? []) as Array<{ slug: string; name: string; status: string; origin_country: string | null }>
    if (ps.length === 0) {
      console.log('  (žádné produkty)')
      continue
    }
    ps.forEach(p => console.log(`  [${p.status}] ${p.origin_country ?? '??'} ${p.slug}`))
  }
}
main().catch(console.error)
