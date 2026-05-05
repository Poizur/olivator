/**
 * Check distinct origin_country values across active products.
 * Run: node --env-file=.env.local --import tsx scripts/check-origins.ts
 */
async function checkOriginsMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin
    .from('products')
    .select('origin_country')
    .eq('status', 'active')
  const counts: Record<string, number> = {}
  for (const r of data ?? []) {
    const k = r.origin_country ?? '<NULL>'
    counts[k as string] = (counts[k as string] ?? 0) + 1
  }
  console.log(`Origin distribution (${data?.length ?? 0} active products):`)
  for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  "${k}" = ${n}`)
  }
}

checkOriginsMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
