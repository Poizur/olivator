/** Feed audit 2 — xml_feed_last_synced + last_result ze sloupců v retailers */
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  const { data, error } = await s
    .from('retailers')
    .select('name, slug, xml_feed_url, xml_feed_format, xml_feed_last_synced, xml_feed_last_result, affiliate_network')
    .eq('is_active', true)
    .order('name')

  if (error) { console.error(error.message); process.exit(1) }

  console.log('═══ XML FEED SYNC STATUS ═══\n')
  for (const r of data ?? []) {
    const hasUrl = !!r.xml_feed_url
    const lastSync = r.xml_feed_last_synced
      ? new Date(r.xml_feed_last_synced).toISOString().slice(0, 16)
      : 'nikdy'

    if (!hasUrl) {
      console.log(`[NO FEED] ${r.name} (${r.affiliate_network ?? 'no-network'})`)
      continue
    }

    const res = r.xml_feed_last_result as any
    const status = res?.status ?? '?'
    const synced = res?.synced ?? 0
    const skipped = res?.skipped ?? 0
    const created = res?.created ?? 0
    const updated = res?.updated ?? 0

    console.log(`[FEED OK] ${r.name}`)
    console.log(`  URL: ${String(r.xml_feed_url).slice(0, 80)}`)
    console.log(`  Format: ${r.xml_feed_format}`)
    console.log(`  Poslední sync: ${lastSync}`)
    console.log(`  Výsledek: status=${status} | synced=${synced} | created=${created} | updated=${updated} | skipped=${skipped}`)
    console.log()
  }

  // Agent decisions pro feed-sync
  const { data: decisions } = await s
    .from('agent_decisions')
    .select('created_at, agent, action, details')
    .ilike('agent', '%feed%')
    .order('created_at', { ascending: false })
    .limit(10)

  if (decisions && decisions.length > 0) {
    console.log('═══ FEED-SYNC agent_decisions (posledních 10) ═══')
    for (const d of decisions) {
      console.log(d.created_at?.slice(0, 16), '|', d.action?.slice(0, 50))
    }
  } else {
    console.log('agent_decisions: žádné feed záznamy')
  }
}
main().catch(console.error)
