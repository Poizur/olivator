import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data: imgs } = await supabaseAdmin.from('entity_images').select('*').eq('entity_type', 'brand').eq('status', 'active')
  const byEntity = new Map<string, number>()
  for (const i of (imgs ?? []) as Array<{ entity_id: string }>) {
    byEntity.set(i.entity_id, (byEntity.get(i.entity_id) ?? 0) + 1)
  }
  // Get brand names
  const { data: brands } = await supabaseAdmin.from('brands').select('id, slug, name')
  const brandById = new Map(((brands ?? []) as Array<{ id: string; slug: string; name: string }>).map(b => [b.id, b]))
  for (const [eid, count] of byEntity.entries()) {
    const b = brandById.get(eid)
    if (b?.slug === 'corinto') {
      console.log(`Corinto images: ${count}`)
      const corintoImgs = (imgs ?? []).filter((i: Record<string, unknown>) => i.entity_id === eid)
      corintoImgs.forEach((i: Record<string, unknown>) => console.log(`  role=${i.image_role ?? 'NULL'} is_primary=${i.is_primary} attribution=${i.source_attribution} url=${(i.url as string).slice(0, 80)}`))
    }
  }
}
main().catch(console.error)
