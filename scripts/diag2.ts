import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Find resolved inactive_with_offers products and check their offers
  const { data: resolved } = await supabaseAdmin
    .from('quality_issues')
    .select('product_id, products!inner(slug, status)')
    .eq('rule_id', 'inactive_with_offers')
    .eq('status', 'resolved')
  const items = ((resolved ?? []) as unknown as Array<{ product_id: string; products: { slug: string; status: string } }>)
  console.log(`${items.length} resolved issues — checking offers in_stock state`)

  let offersTotal = 0
  let offersInStock = 0
  let offersOutOfStock = 0
  for (const i of items) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('in_stock')
      .eq('product_id', i.product_id)
    const ofs = (offers ?? []) as Array<{ in_stock: boolean }>
    offersTotal += ofs.length
    offersInStock += ofs.filter(o => o.in_stock).length
    offersOutOfStock += ofs.filter(o => !o.in_stock).length
  }
  console.log(`Offers total: ${offersTotal}, in_stock: ${offersInStock}, out_of_stock: ${offersOutOfStock}`)
}
main().catch(console.error)
