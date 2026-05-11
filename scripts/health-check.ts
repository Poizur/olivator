import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  console.log('═══ Stav webu + monetizace ═══\n')

  // 1. Web responding
  const healthRes = await fetch('https://olivator.cz/api/health').catch(e => ({ ok: false, error: e.message } as Response & { error: string }))
  console.log(`1) olivator.cz health: ${healthRes.ok ? '✅ Online' : '❌ ' + ('error' in healthRes ? healthRes.error : 'down')}`)

  // 2. Produkty a brandy
  const { count: active } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: draft } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft')
  console.log(`2) Produkty: ${active} aktivních, ${draft} draft`)

  // 3. Affiliate readiness: kolik offerů má funkční /go/ redirect
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('id, product_url, affiliate_url, retailers!inner(slug, name, base_tracking_url, is_active)')
    .eq('in_stock', true)
    .limit(2000)
  const ofs = (offers ?? []) as unknown as Array<{
    product_url: string | null
    affiliate_url: string | null
    retailers: { slug: string; name: string; base_tracking_url: string | null; is_active: boolean }
  }>
  const total = ofs.length
  const withTracking = ofs.filter(o => o.retailers.is_active && (o.retailers.base_tracking_url || o.affiliate_url))
  const noTrack = ofs.filter(o => o.retailers.is_active && !o.retailers.base_tracking_url && !o.affiliate_url)
  console.log(`3) Offery in_stock: ${total}`)
  console.log(`   ├─ s funkčním /go/ redirect: ${withTracking.length} (${Math.round(withTracking.length / total * 100)}%)`)
  console.log(`   └─ bez trackingu (lost commission): ${noTrack.length}`)

  // 4. Retailers bez template (těch musí být malo, jinak ztrácíme peníze)
  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('slug, name, base_tracking_url, is_active')
    .eq('is_active', true)
  const rs = (retailers ?? []) as Array<{ slug: string; name: string; base_tracking_url: string | null }>
  const noTemplate = rs.filter(r => !r.base_tracking_url)
  console.log(`4) Aktivních retailerů: ${rs.length}, bez tracking template: ${noTemplate.length}`)
  if (noTemplate.length > 0) {
    console.log(`   ${noTemplate.map(r => r.name).join(', ')}`)
  }

  // 5. Klíčové content pieces
  const { count: articles } = await supabaseAdmin.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: recipes } = await supabaseAdmin.from('recipes').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: rankings } = await supabaseAdmin.from('rankings').select('*', { count: 'exact', head: true }).eq('status', 'active')
  console.log(`5) SEO obsah: ${articles} článků, ${recipes} receptů, ${rankings} žebříčků`)

  // 6. Affiliate clicks za posledních 30 dní
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const { count: clicksLast30 } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .gte('clicked_at', thirtyDaysAgo)
  console.log(`6) Affiliate kliků za 30 dní: ${clicksLast30}`)
}
main().catch(console.error)
