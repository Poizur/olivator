import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Jak vypadá DealRow — má image_url v DealData?
  // Zkontroluj posledni draft — co bylo ve slevovém radaru
  const { data: draft } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('blocks, subject')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const blocks = (draft as { blocks: { deals?: Array<{ name: string; productId: string }> } }).blocks
  console.log('Poslední draft:', (draft as { subject: string }).subject)
  console.log('Deals v draftu:', blocks?.deals?.length ?? 0)
  for (const d of blocks?.deals ?? []) {
    console.log(`  ${d.name}`)
    // Zkontroluj aktuální in_stock stav
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price, in_stock, last_checked')
      .eq('product_id', d.productId)
      .eq('in_stock', true)
    console.log(`    in_stock offers: ${offers?.length ?? 0} | last_checked: ${offers?.[0]?.last_checked?.slice(0,10) ?? 'N/A'}`)
  }

  // Produkty s in_stock=true ale žádný price_history v posledních 7 dnech (stale)
  const { data: inStockOffers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, retailer_id, price, last_checked')
    .eq('in_stock', true)
    .limit(100)
  
  let staleCount = 0
  const week7ago = new Date(Date.now() - 7 * 86400000).toISOString()
  for (const o of (inStockOffers ?? []).slice(0, 20)) {
    const { count } = await supabaseAdmin
      .from('price_history')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', o.product_id as string)
      .eq('retailer_id', o.retailer_id as string)
      .gte('recorded_at', week7ago)
    if ((count ?? 0) === 0) staleCount++
  }
  console.log(`\nStale in_stock (žádný price_history 7d) sample: ${staleCount}/20`)
}
main().catch(console.error)
