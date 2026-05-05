/**
 * List all cultivars in DB.
 * Run: node --env-file=.env.local --import tsx scripts/list-cultivars.ts
 */
async function listCultivarsMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin.from('cultivars').select('slug, name, status').order('name')
  console.log(`Cultivars (${data?.length ?? 0}):\n`)
  for (const c of data ?? []) {
    console.log(`  [${c.status}] ${c.slug.padEnd(25)} ${c.name}`)
  }
}

listCultivarsMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
