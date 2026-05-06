async function checkIliadaMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const slug = 'iliada-kalamata-extra-panensky-olivovy-olej-0-5-500ml'

  const { data: p } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, ean, image_url, image_source, source_url')
    .eq('slug', slug)
    .maybeSingle()
  if (!p) {
    console.log('Product not found')
    return
  }
  console.log('PRODUCT:')
  console.log(`  id:           ${p.id}`)
  console.log(`  name:         ${p.name}`)
  console.log(`  ean:          ${p.ean ?? '(null)'}`)
  console.log(`  image_url:    ${p.image_url ?? '(null)'}`)
  console.log(`  image_source: ${p.image_source ?? '(null)'}`)
  console.log(`  source_url:   ${p.source_url ?? '(null)'}`)
  console.log()

  const { data: gallery } = await supabaseAdmin
    .from('product_images')
    .select('url, alt_text, is_primary, source, sort_order')
    .eq('product_id', p.id)
    .order('is_primary', { ascending: false })
    .order('sort_order')
  console.log(`GALLERY (product_images): ${gallery?.length ?? 0} fotek`)
  for (const g of gallery ?? []) {
    console.log(`  primary=${g.is_primary} source=${g.source} url=${(g.url as string).slice(0, 90)}`)
  }
  console.log()

  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('retailer_id, price, product_url, affiliate_url, retailers!inner(slug, name, base_tracking_url, domain)')
    .eq('product_id', p.id)
  console.log(`OFFERS: ${offers?.length ?? 0}`)
  for (const o of offers ?? []) {
    const r = Array.isArray(o.retailers) ? o.retailers[0] : o.retailers
    console.log(`  ${(r as { name: string }).name}:`)
    console.log(`    price: ${o.price}`)
    console.log(`    product_url: ${o.product_url ?? '(null)'}`)
    console.log(`    affiliate_url: ${o.affiliate_url ?? '(null)'}`)
    console.log(`    retailer.base_tracking_url: ${(r as { base_tracking_url: string | null }).base_tracking_url ?? '(null)'}`)
    console.log(`    retailer.domain: ${(r as { domain: string }).domain}`)
  }
}

checkIliadaMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
