import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  for (const slug of ['casa', 'crasto', 'extra', 'p-d-o', 'p d o']) {
    const { data: b } = await supabaseAdmin.from('brands').select('slug, name, status, created_at, updated_at').eq('slug', slug).maybeSingle()
    if (b) {
      console.log(`\nBrand "${slug}":`, b)
      const { data: ps } = await supabaseAdmin.from('products').select('slug, name, source_url').eq('brand_slug', slug).limit(3)
      ;(ps ?? []).forEach((p: { slug: string; name: string; source_url: string | null }) =>
        console.log(`  • ${p.name.slice(0, 60)} (src: ${p.source_url?.slice(0, 50) ?? 'none'})`)
      )
    }
  }
}
main().catch(console.error)
