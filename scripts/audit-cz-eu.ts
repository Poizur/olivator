import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: czProducts, error: e1 } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, source_url, origin_country, origin_region')
    .eq('origin_country', 'CZ')
    .eq('status', 'active')
  console.log('=== CZ produkty ===')
  console.log(JSON.stringify(czProducts, null, 2))
  if (e1) console.error(e1)

  const { data: euProducts, error: e2 } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, source_url, origin_country, origin_region')
    .eq('origin_country', 'EU')
    .eq('status', 'active')
  console.log('=== EU produkty ===')
  console.log(JSON.stringify(euProducts, null, 2))
  if (e2) console.error(e2)
}

main().catch(err => { console.error(err); process.exit(1) })
