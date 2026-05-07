import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('retailers').select('slug, name, base_tracking_url, domain, is_active').eq('slug', 'reckyeshop').maybeSingle()
  console.log(data)
}
main().catch(console.error)
