import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Najdi všechny brandy s name = 'Extra' nebo 'panensky' nebo prázdné slugy
  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, status')
    .or('name.ilike.extra,name.ilike.panensky,name.ilike.panenský,slug.ilike.extra%,slug.ilike.panensk%')
    .order('slug')

  const bs = (brands ?? []) as Array<{ id: string; slug: string; name: string; status: string }>
  console.log(`Junk brand candidates: ${bs.length}\n`)
  for (const b of bs) {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('slug, name, status, source_url')
      .eq('brand_slug', b.slug)
    const ps = (products ?? []) as Array<{ slug: string; name: string; status: string; source_url: string | null }>
    console.log(`══ brand: "${b.name}" [slug=${b.slug}] (${b.status}, ${ps.length} produktů)`)
    ps.forEach(p => console.log(`   • [${p.status}] ${p.name.slice(0, 80)}`))
    console.log('')
  }
}
main().catch(console.error)
