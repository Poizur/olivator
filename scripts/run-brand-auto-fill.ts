/**
 * Run brand auto-fill — buď konkrétní slug nebo všechny prázdné.
 *
 * Run: node --env-file=.env.local --import tsx scripts/run-brand-auto-fill.ts [slug]
 *
 * Bez argumentu: projde všechny značky bez description_long.
 * S argumentem (např. "intini"): jen tu jednu.
 */

async function main() {
  // Dynamic import — env musí být načtený před modulem
  const { autoFillBrand } = await import('@/lib/brand-auto-fill')
  const { supabaseAdmin } = await import('@/lib/supabase')

  const targetSlug = process.argv[2]

  let brands: Array<{ slug: string; name: string }>
  if (targetSlug) {
    const { data, error } = await supabaseAdmin
      .from('brands')
      .select('slug, name')
      .eq('slug', targetSlug)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error(`Brand "${targetSlug}" nenalezen`)
    brands = [data as { slug: string; name: string }]
  } else {
    const { data, error } = await supabaseAdmin
      .from('brands')
      .select('slug, name, description_long')
      .or('description_long.is.null,description_long.eq.')
      .order('slug')
    if (error) throw new Error(error.message)
    brands = (data ?? []).map((b) => ({ slug: b.slug as string, name: b.name as string }))
  }

  console.log(`\n🚀 Spouštím auto-fill pro ${brands.length} značek...\n`)

  const summary = { applied: 0, pending: 0, rejected: 0, no_url: 0, error: 0 }

  for (let i = 0; i < brands.length; i++) {
    const b = brands[i]
    console.log(`[${i + 1}/${brands.length}] ${b.name} (${b.slug})...`)
    const start = Date.now()
    try {
      const report = await autoFillBrand(b.slug)
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      const overallConf =
        report.candidate && report.verification
          ? Math.min(report.candidate.confidence, report.verification.confidence)
          : report.candidate?.confidence ?? 0
      console.log(`  → ${report.status} (${overallConf}/100, ${elapsed}s)`)
      console.log(`    ${report.message}`)
      if (report.candidate) console.log(`    URL: ${report.candidate.url} (${report.candidate.source})`)
      if (report.appliedFields.length > 0) {
        console.log(`    ✓ Aplikovaná pole: ${report.appliedFields.join(', ')}`)
      }
      if (report.logoSaved) console.log(`    ✓ Logo uloženo`)

      summary[report.status === 'pending_review' ? 'pending' : (report.status as keyof typeof summary)]++
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      console.log(`  ✗ EXCEPTION (${elapsed}s): ${err instanceof Error ? err.message : 'unknown'}`)
      summary.error++
    }
    console.log()
  }

  console.log('━'.repeat(60))
  console.log('SUMMARY:')
  console.log(`  ✓ Aplikováno:    ${summary.applied}`)
  console.log(`  ⚠ K revizi:      ${summary.pending}`)
  console.log(`  ✗ Cross-check ✗: ${summary.rejected}`)
  console.log(`  ✗ Bez URL:       ${summary.no_url}`)
  console.log(`  ✗ Chyba:         ${summary.error}`)
  console.log('━'.repeat(60))
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
