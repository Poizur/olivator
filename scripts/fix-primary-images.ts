/**
 * Backfill is_primary=true pro produkty kde gallery má fotky,
 * ale žádná není označená jako primary.
 *
 * Run: node --env-file=.env.local --import tsx scripts/fix-primary-images.ts
 */
async function fixPrimaryImagesMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')

  const { data: prods } = await supabaseAdmin
    .from('products')
    .select('id, slug')
    .eq('status', 'active')

  let fixed = 0
  let skipped = 0
  for (const p of prods ?? []) {
    const { data: imgs } = await supabaseAdmin
      .from('product_images')
      .select('id, is_primary, sort_order')
      .eq('product_id', p.id as string)
      .neq('source', 'scraper_candidate')
      .order('sort_order')

    if (!imgs || imgs.length === 0) {
      skipped++
      continue
    }
    const hasPrimary = imgs.some((i) => i.is_primary)
    if (hasPrimary) continue

    // No primary — mark the first one as primary
    await supabaseAdmin
      .from('product_images')
      .update({ is_primary: true })
      .eq('id', imgs[0].id as string)
    console.log(`  ✓ ${p.slug}`)
    fixed++
  }
  console.log(`\nFixed: ${fixed}, Skipped (no gallery): ${skipped}, Total: ${prods?.length ?? 0}`)
}

fixPrimaryImagesMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
