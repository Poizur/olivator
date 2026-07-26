import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Hledej v product_offers historii — kdy bylo naposledy in_stock=true
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('id, product_url, in_stock, price, last_checked, last_price_change')
    .eq('product_id', 'cbe2ef9c-941a-4289-9070-4a8d99a19259')
  console.log('product_offers:', JSON.stringify(offers, null, 2))

  // Zkus najít v agent_decisions bez filtru na datum
  const { data: ad } = await supabaseAdmin
    .from('agent_decisions')
    .select('id, decision_type, context, created_at')
    .ilike('context::text', '%liofyto%')
    .order('created_at', { ascending: false })
    .limit(5)
  console.log('\nagent_decisions (liofyto):', JSON.stringify(ad, null, 2))
  
  // Zkus link-check tabulku
  const tables = ['link_checks', 'link_rot_log', 'cron_runs', 'job_runs']
  for (const t of tables) {
    const { error } = await supabaseAdmin.from(t).select('id').limit(1)
    if (!error) console.log(`${t}: existuje`)
    else console.log(`${t}: ${error.message.slice(0, 50)}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
