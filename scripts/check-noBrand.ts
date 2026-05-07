import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { count: noBrand } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).is('brand_slug', null).eq('status', 'active')
  console.log('No brand_slug (active):', noBrand)
  // Check source_url breakdown for those — might give clue to brand
  const { data } = await supabaseAdmin.from('products').select('source_url').is('brand_slug', null).eq('status', 'active')
  const domains = new Map<string, number>()
  for (const p of (data ?? []) as Array<{ source_url: string | null }>) {
    if (!p.source_url) continue
    try {
      const u = new URL(p.source_url)
      const domain = u.hostname.replace(/^www\./, '')
      domains.set(domain, (domains.get(domain) ?? 0) + 1)
    } catch {}
  }
  console.log('\nSource URL domains:')
  ;[...domains.entries()].sort((a,b) => b[1]-a[1]).forEach(([d, n]) => console.log(`  ${d}: ${n}`))
}
main().catch(console.error)
