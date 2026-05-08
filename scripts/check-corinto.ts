import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const slug = 'corinto-pelopones-extra-panensky-olivovy-olej-manaki-0-3-100-ml-sklo'
  const { data: p } = await supabaseAdmin.from('products').select('*').eq('slug', slug).maybeSingle()
  if (!p) { console.log('Product not found'); return }
  const prod = p as Record<string, unknown>
  console.log('image_url:', prod.image_url)
  console.log('image_source:', prod.image_source)
  console.log('source_url:', prod.source_url)
  console.log('status:', prod.status)
  console.log('name:', prod.name)
  
  const { data: imgs } = await supabaseAdmin.from('product_images').select('id, url, is_primary, status, source').eq('product_id', prod.id as string)
  console.log('\nproduct_images:')
  ;(imgs ?? []).forEach((i: Record<string, unknown>) => console.log(`  is_primary=${i.is_primary} status=${i.status} source=${i.source} url=${(i.url as string).slice(0, 80)}`))
}
main().catch(console.error)
