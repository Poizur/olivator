/** Doplní affiliate_url pro 2 Řecko nás baví nabídky bez affiliate */
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
function buildAffiliateUrl(t: string, slug: string, url: string) {
  return t.replace('{product_slug}', encodeURIComponent(slug)).replace('{product_url}', encodeURIComponent(url))
}
async function main() {
  const { data: r } = await s.from('retailers').select('id, base_tracking_url').eq('slug', 'reckonasbavi').single()
  const template = r!.base_tracking_url as string
  const { data: offers } = await s
    .from('product_offers')
    .select('id, product_url, products!inner(slug)')
    .eq('retailer_id', r!.id)
    .is('affiliate_url', null)
    .not('product_url', 'is', null)
  console.log(`Nabídek bez affiliate: ${offers?.length ?? 0}`)
  for (const o of offers ?? []) {
    const slug = (o.products as any)?.slug as string
    const url = o.product_url as string
    if (!slug || !url) { console.log('  SKIP (chybí slug/url)'); continue }
    const affUrl = buildAffiliateUrl(template, slug, url)
    const { error } = await s.from('product_offers').update({ affiliate_url: affUrl }).eq('id', o.id)
    if (error) console.log(`  ❌ ${slug}: ${error.message}`)
    else console.log(`  ✅ ${slug}`)
  }
  const { data: rem } = await s.from('product_offers').select('id').eq('retailer_id', r!.id).is('affiliate_url', null)
  console.log(`Stále bez affiliate: ${rem?.length ?? 0}`)
}
main().catch(console.error)
