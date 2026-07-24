/**
 * Doplní affiliate_url pro všechny Reckyeshop nabídky bez affiliate.
 * Bez HTTP verify — Reckyeshop blokuje HEAD requesty.
 * Link-check cron hlídá dead links separátně.
 */
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

function buildAffiliateUrl(template: string, productSlug: string, productUrl: string): string {
  return template
    .replace('{product_slug}', encodeURIComponent(productSlug))
    .replace('{product_url}', encodeURIComponent(productUrl))
}

async function main() {
  const { data: retailer } = await s
    .from('retailers')
    .select('id, name, base_tracking_url')
    .eq('slug', 'reckyeshop')
    .single()

  const template = retailer!.base_tracking_url as string
  console.log(`Template: ${template.slice(0, 80)}`)
  console.log()

  const { data: offers } = await s
    .from('product_offers')
    .select('id, product_url, products!inner(slug)')
    .eq('retailer_id', retailer!.id)
    .is('affiliate_url', null)
    .not('product_url', 'is', null)

  console.log(`Nabídek bez affiliate_url: ${offers?.length ?? 0}`)

  let applied = 0, failed = 0
  for (const offer of offers ?? []) {
    const productSlug = (offer.products as any)?.slug as string
    const productUrl = offer.product_url as string

    if (!productSlug || !productUrl) continue

    const affiliateUrl = buildAffiliateUrl(template, productSlug, productUrl)
    const { error } = await s.from('product_offers').update({ affiliate_url: affiliateUrl }).eq('id', offer.id)

    if (error) { console.log(`  ❌ ${productSlug}: ${error.message}`); failed++; continue }
    console.log(`  ✅ ${productSlug.slice(0, 65)}`)
    applied++
  }

  console.log(`\nHotovo: ${applied} nastaveno | ${failed} chyb`)

  // Verify: žádné NULL affiliate_url v Reckyeshop
  const { data: remaining } = await s
    .from('product_offers')
    .select('id')
    .eq('retailer_id', retailer!.id)
    .is('affiliate_url', null)
  console.log(`Stále bez affiliate_url: ${remaining?.length ?? 0}`)
}
main().catch(console.error)
