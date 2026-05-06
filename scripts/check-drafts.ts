/**
 * Check product status distribution + draft details.
 * Run: node --env-file=.env.local --import tsx scripts/check-drafts.ts
 */
async function checkDraftsMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')

  // 1. Status distribution
  const { data: all } = await supabaseAdmin.from('products').select('status, status_reason_code, name')
  const counts: Record<string, number> = {}
  const reasonCounts: Record<string, number> = {}
  for (const r of all ?? []) {
    counts[r.status] = (counts[r.status] ?? 0) + 1
    if (r.status_reason_code) reasonCounts[r.status_reason_code] = (reasonCounts[r.status_reason_code] ?? 0) + 1
  }
  console.log(`Total products: ${all?.length ?? 0}\n`)
  console.log('Status distribution:')
  for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(15)}: ${n}`)
  }
  console.log()
  if (Object.keys(reasonCounts).length > 0) {
    console.log('Status reasons:')
    for (const [k, n] of Object.entries(reasonCounts)) {
      console.log(`  ${k.padEnd(20)}: ${n}`)
    }
    console.log()
  }

  // 2. Drafts breakdown
  const { data: drafts } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, ean, image_url, description_short, description_long, meta_description, olivator_score, brand_slug, region_slug, origin_country, created_at, updated_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })

  console.log(`\n═══ DRAFTS (${drafts?.length ?? 0}) ═══\n`)

  // Quality scoring
  const stats = {
    total: drafts?.length ?? 0,
    withEan: 0,
    withImage: 0,
    withScore: 0,
    withDescShort: 0,
    withDescLong: 0,
    withMeta: 0,
    withBrand: 0,
    withRegion: 0,
    fullyComplete: 0, // má vše
  }
  for (const d of drafts ?? []) {
    if (d.ean) stats.withEan++
    if (d.image_url) stats.withImage++
    if (d.olivator_score != null && d.olivator_score > 0) stats.withScore++
    if (d.description_short) stats.withDescShort++
    if (d.description_long) stats.withDescLong++
    if (d.meta_description) stats.withMeta++
    if (d.brand_slug) stats.withBrand++
    if (d.region_slug) stats.withRegion++
    const complete =
      d.image_url && d.olivator_score && d.description_short && d.brand_slug && d.region_slug
    if (complete) stats.fullyComplete++
  }
  console.log('Quality coverage:')
  console.log(`  s EAN:           ${stats.withEan}/${stats.total} (${Math.round((stats.withEan / Math.max(1, stats.total)) * 100)}%)`)
  console.log(`  s obrázkem:      ${stats.withImage}/${stats.total} (${Math.round((stats.withImage / Math.max(1, stats.total)) * 100)}%)`)
  console.log(`  s Score:         ${stats.withScore}/${stats.total} (${Math.round((stats.withScore / Math.max(1, stats.total)) * 100)}%)`)
  console.log(`  s desc_short:    ${stats.withDescShort}/${stats.total} (${Math.round((stats.withDescShort / Math.max(1, stats.total)) * 100)}%)`)
  console.log(`  s desc_long:     ${stats.withDescLong}/${stats.total} (${Math.round((stats.withDescLong / Math.max(1, stats.total)) * 100)}%)`)
  console.log(`  s meta_desc:     ${stats.withMeta}/${stats.total} (${Math.round((stats.withMeta / Math.max(1, stats.total)) * 100)}%)`)
  console.log(`  s brand_slug:    ${stats.withBrand}/${stats.total} (${Math.round((stats.withBrand / Math.max(1, stats.total)) * 100)}%)`)
  console.log(`  s region_slug:   ${stats.withRegion}/${stats.total} (${Math.round((stats.withRegion / Math.max(1, stats.total)) * 100)}%)`)
  console.log(`  ✅ kompletní:    ${stats.fullyComplete}/${stats.total} (${Math.round((stats.fullyComplete / Math.max(1, stats.total)) * 100)}%)`)

  // 3. First 10 sample drafts
  console.log(`\nSample (oldest 10):`)
  for (const d of (drafts ?? []).slice(-10).reverse()) {
    const flags = [
      d.image_url ? '🖼' : '·',
      d.olivator_score ? '⭐' : '·',
      d.description_short ? '📝' : '·',
      d.brand_slug ? '🏷' : '·',
      d.region_slug ? '🗺' : '·',
    ].join('')
    const date = new Date(d.created_at as string).toLocaleDateString('cs-CZ')
    console.log(`  ${flags} ${date}  ${d.name?.slice(0, 70)}`)
  }

  // 4. Recently created (jsou nějaké nové po cron discovery?)
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const { count: recentCount } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')
    .gte('created_at', sevenDaysAgo.toISOString())
  console.log(`\nNové drafty za posledních 7 dní: ${recentCount ?? 0}`)
}

checkDraftsMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
