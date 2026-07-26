import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Check top 10 products by olivator_score for ab test candidates
  const { data } = await supabaseAdmin
    .from('products')
    .select('slug, name, meta_title, olivator_score')
    .eq('status', 'active')
    .not('meta_title', 'is', null)
    .order('olivator_score', { ascending: false })
    .limit(10)
  
  for (const p of (data ?? [])) {
    console.log(`[${p.olivator_score}] ${p.slug}`)
    console.log(`  meta_title: ${p.meta_title}`)
  }
  
  // Check if meta_title_alt column exists
  const { data: sample } = await supabaseAdmin.from('products').select('*').limit(1)
  if (sample?.[0]) {
    const cols = Object.keys(sample[0])
    const altCols = cols.filter(c => c.includes('alt') || c.includes('variant'))
    console.log('\nAlternate/variant columns:', altCols.length ? altCols : 'none')
  }
}
main().catch(console.error)
