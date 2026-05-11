import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Clicks per retailer last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: clicks } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('retailer_id')
    .gte('clicked_at', thirtyDaysAgo)
  const byRetailer = new Map<string, number>()
  for (const c of (clicks ?? []) as Array<{ retailer_id: string | null }>) {
    if (!c.retailer_id) continue
    byRetailer.set(c.retailer_id, (byRetailer.get(c.retailer_id) ?? 0) + 1)
  }
  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, base_tracking_url, default_commission_pct, affiliate_network, is_active')
    .eq('is_active', true)
  const rs = (retailers ?? []) as Array<{
    id: string; slug: string; name: string; base_tracking_url: string | null
    default_commission_pct: number | null; affiliate_network: string | null
  }>
  const enriched = rs.map(r => ({
    ...r,
    clicks30d: byRetailer.get(r.id) ?? 0,
    hasTemplate: !!r.base_tracking_url,
  })).sort((a, b) => b.clicks30d - a.clicks30d)
  console.log('Retailer | Síť | Klik 30d | Template')
  enriched.slice(0, 20).forEach(r => {
    const flag = r.hasTemplate ? '✅' : '⚠️ LOST'
    console.log(`  ${r.name.padEnd(28)} ${r.affiliate_network?.padEnd(15) ?? '—'.padEnd(15)} ${String(r.clicks30d).padStart(4)} ${flag}`)
  })
  console.log(`\nTotal: ${enriched.length} retailerů, ${enriched.reduce((s, r) => s + r.clicks30d, 0)} kliků`)
  const lost = enriched.filter(r => !r.hasTemplate)
  console.log(`Lost commission: ${lost.length} retailerů, ${lost.reduce((s, r) => s + r.clicks30d, 0)} kliků`)
}
main().catch(console.error)
