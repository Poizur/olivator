import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const tables = ['seo_activity_log', 'seo_metric_snapshots', 'seo_notes', 'gsc_keyword_metrics', 'authors', 'glossary_terms']
  for (const t of tables) {
    const { count, error } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true })
    if (error) console.log(`  ❌ ${t}: ${error.message.slice(0, 50)}`)
    else console.log(`  ✅ ${t}: ${count ?? 0} rows`)
  }
}
main().catch(console.error)
