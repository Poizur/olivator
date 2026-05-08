import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('id, entity_id, source, source_attribution, url')
    .eq('entity_type', 'brand')
    .eq('status', 'active')
    .like('url', '%images.unsplash.com%')
  const items = (data ?? []) as Array<{ id: string; entity_id: string; source_attribution: string | null }>
  console.log(`Brand Unsplash photos: ${items.length}`)
  // Group by entity → show attribution per brand
  const { data: brands } = await supabaseAdmin.from('brands').select('id, slug, name')
  const map = new Map(((brands ?? []) as Array<{ id: string; slug: string; name: string }>).map(b => [b.id, b]))
  for (const i of items) {
    const b = map.get(i.entity_id)
    console.log(`  ${b?.slug.padEnd(20) ?? '?'} → photographer/title: "${i.source_attribution ?? ''}"`)
  }
}
main().catch(console.error)
