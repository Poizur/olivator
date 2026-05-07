import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, slug')
    .eq('status', 'active')

  const ps = (products ?? []) as Array<{ id: string; name: string; slug: string }>
  let withImage = 0
  let noImage = 0

  for (const p of ps) {
    const { data: img } = await supabaseAdmin
      .from('product_images')
      .select('url, width, height, alt_text')
      .eq('product_id', p.id)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle()
    if (img && (img as { url: string }).url) {
      withImage++
    } else {
      noImage++
      if (noImage <= 5) console.log(`  ❌ ${p.slug.slice(0, 50)}`)
    }
  }
  console.log(`\nOG IMAGES (primary product photos)`)
  console.log(`  Has image: ${withImage}`)
  console.log(`  Missing:   ${noImage}`)
}
main().catch(console.error)
