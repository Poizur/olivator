import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data: products } = await supabaseAdmin.from('products').select('brand_slug').not('brand_slug', 'is', null)
  const slugCounts = new Map<string, number>()
  for (const p of (products ?? []) as Array<{ brand_slug: string }>) {
    slugCounts.set(p.brand_slug, (slugCounts.get(p.brand_slug) ?? 0) + 1)
  }
  const { data: brands } = await supabaseAdmin.from('brands').select('slug')
  const existingSlugs = new Set(((brands ?? []) as Array<{ slug: string }>).map(b => b.slug))

  console.log('Orphan brand_slugs (FK to non-existent brand):')
  for (const [slug, count] of slugCounts) {
    if (!existingSlugs.has(slug)) {
      console.log(`  ${slug}: ${count} produktů`)
      const { data: p } = await supabaseAdmin.from('products').select('name').eq('brand_slug', slug).limit(2)
      ;(p ?? []).forEach((pp: { name: string }) => console.log(`    • ${pp.name.slice(0, 70)}`))
    }
  }
}
main().catch(console.error)
