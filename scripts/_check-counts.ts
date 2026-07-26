import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const [p, r, xmlR, offers] = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('retailers').select('slug, name, xml_feed_url').eq('is_active', true),
    supabaseAdmin.from('retailers').select('slug').eq('is_active', true).not('xml_feed_url', 'is', null),
    supabaseAdmin.from('product_offers').select('*', { count: 'exact', head: true }).eq('in_stock', true),
  ])
  console.log('active products:', p.count)
  console.log('active retailers:', r.data?.length, r.data?.map(x => x.name).join(', '))
  console.log('retailers with XML feed:', xmlR.data?.length)
  console.log('retailers without XML (playwright):', (r.data?.length ?? 0) - (xmlR.data?.length ?? 0))
  console.log('in_stock offers:', offers.count)
}
main().catch(console.error)
