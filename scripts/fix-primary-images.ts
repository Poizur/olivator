/**
 * Backfill is_primary=true pro produkty kde gallery má fotky,
 * ale žádná není označená jako primary.
 *
 * Upřednostňuje: scraper > scraper_candidate > ostatní
 * (V předchozí verzi byl scraper_candidate vynechán → produkty bez scraper
 * zůstaly bez primary. Opraveno 2026-05-16.)
 *
 * Run: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/fix-primary-images.ts
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
    // Fetch all gallery images — include scraper_candidate this time
    const { data: imgs } = await supabaseAdmin
      .from('product_images')
      .select('id, is_primary, sort_order, source')
      .eq('product_id', p.id as string)
      .order('sort_order')
      .order('created_at', { ascending: true } as never)

    if (!imgs || imgs.length === 0) {
      skipped++
      continue
    }
    const hasPrimary = imgs.some((i) => i.is_primary)
    if (hasPrimary) continue

    // Pick best candidate: prefer scraper, then scraper_candidate, then any
    const candidate =
      imgs.find(i => i.source === 'scraper') ??
      imgs.find(i => i.source === 'scraper_candidate') ??
      imgs[0]

    await supabaseAdmin
      .from('product_images')
      .update({ is_primary: true })
      .eq('id', candidate.id as string)
    console.log(`  ✓ ${p.slug} — promoted ${candidate.source} image`)
    fixed++
  }
  console.log(`\nFixed: ${fixed}, Skipped (no gallery): ${skipped}, Total: ${prods?.length ?? 0}`)
}

fixPrimaryImagesMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
