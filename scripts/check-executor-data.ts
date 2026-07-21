import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: retailers } = await supabaseAdmin.from('retailers').select('id,name,slug,base_tracking_url').not('base_tracking_url', 'is', null)
  console.log('RETAILERS:', JSON.stringify(retailers?.map(r => ({ name: r.name, slug: r.slug, url: r.base_tracking_url })), null, 2))

  for (const r of retailers ?? []) {
    const { data: offers } = await supabaseAdmin.from('product_offers')
      .select('id, product_id, product_url, products!inner(name, slug)')
      .eq('retailer_id', r.id)
      .is('affiliate_url', null)
      .eq('in_stock', true)
      .limit(3)
    const { count } = await supabaseAdmin.from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('retailer_id', r.id)
      .is('affiliate_url', null)
      .eq('in_stock', true)
    console.log(`\n${r.name}: ${count} offers bez affiliate_url, sample:`)
    offers?.forEach(o => console.log(`  ${(o.products as any)?.slug} → ${o.product_url}`))
  }

  const { data: bts } = await supabaseAdmin.from('agent_decisions')
    .select('id, entity_id, entity_type, reasoning, created_at')
    .eq('decision_type', 'broken_tokens_found')
    .order('created_at', { ascending: false })
    .limit(5)
  console.log('\nBROKEN TOKEN decisions:', JSON.stringify(bts?.map(b => ({ id: b.id, entity_type: b.entity_type, created_at: b.created_at, reasoning: (b.reasoning as string)?.slice(0, 200) })), null, 2))

  const { data: noScore } = await supabaseAdmin.from('products')
    .select('id, name, slug, olivator_score, acidity, polyphenols, type')
    .eq('status', 'active')
    .is('olivator_score', null)
    .not('acidity', 'is', null)
    .limit(5)
  console.log('\nPRODUCTS no score (sample):', JSON.stringify(noScore, null, 2))
  
  const { count: noScoreCount } = await supabaseAdmin.from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('olivator_score', null)
    .not('acidity', 'is', null)
  console.log('Total without score (with acidity):', noScoreCount)
  
  const { count: noScorePoly } = await supabaseAdmin.from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('olivator_score', null)
    .not('polyphenols', 'is', null)
  console.log('Total without score (with polyphenols only):', noScorePoly)
}
main().catch(console.error)
