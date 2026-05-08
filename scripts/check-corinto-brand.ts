import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data: brand } = await supabaseAdmin.from('brands').select('id, slug, name').eq('slug', 'corinto').maybeSingle()
  console.log('Brand:', brand)
  const { data: imgs } = await supabaseAdmin.from('entity_images').select('id, role, status, source, url, alt_text, source_attribution').eq('entity_id', (brand as { id: string }).id).eq('entity_type', 'brand').order('is_primary', { ascending: false }).order('sort_order')
  console.log('\nImages:')
  ;(imgs ?? []).forEach((i: Record<string, unknown>) => console.log(`  status=${i.status} role=${i.role ?? '?'} source=${i.source} attribution="${i.source_attribution ?? ''}" url=${(i.url as string).slice(0, 80)}`))
}
main().catch(console.error)
