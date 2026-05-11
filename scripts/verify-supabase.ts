import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { count: products } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: brands } = await supabaseAdmin.from('brands').select('*', { count: 'exact', head: true })
  // Check for new junk brand "Bio"
  const { data: bio } = await supabaseAdmin.from('brands').select('slug, name, status, created_at').or('name.ilike.bio,name.ilike.ecoato,slug.eq.planete')
  console.log('✅ Supabase reachable')
  console.log(`   ${products} aktivních produktů, ${brands} brandů`)
  console.log('\nNew junk brands z cron logu:')
  console.log(bio)
}
main().catch(console.error)
