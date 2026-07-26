import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('products')
    .select('slug, name, status, type, olivator_score')
    .eq('type', 'pomace')
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
  console.log('Active pomace products:')
  data?.forEach(p => console.log(`  ${p.slug} | score=${p.olivator_score} | ${p.name?.slice(0, 60)}`))
  
  // Also check the liofyto product
  const { data: liofyto } = await supabaseAdmin
    .from('products')
    .select('slug, name, status, type')
    .ilike('slug', '%liofyto%')
  console.log('\nLiofyto products:')
  liofyto?.forEach(p => console.log(`  ${p.slug} | status=${p.status} | type=${p.type}`))
}
main().catch(e => { console.error(e); process.exit(1) })
