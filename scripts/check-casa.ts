import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data: p } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, brand_slug, image_url, image_source, source_url')
    .ilike('name', '%casa dos montes%')
    .maybeSingle()
  console.log('Product:', p)
  if (p) {
    const { data: imgs } = await supabaseAdmin
      .from('product_images')
      .select('id, url, alt_text, is_primary, source')
      .eq('product_id', (p as { id: string }).id)
    console.log('\nImages:')
    ;(imgs ?? []).forEach((i: { url: string; is_primary: boolean; source: string }) =>
      console.log(`  ${i.is_primary ? '⭐ PRIMARY' : '   '} [${i.source}] ${i.url.slice(0, 80)}`)
    )
  }
}
main().catch(console.error)
