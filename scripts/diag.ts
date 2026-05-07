import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { count: drafts } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft')
  const { count: active } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: inactive } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'inactive')
  console.log('Status breakdown:', { drafts, active, inactive })

  // Find products linked to resolved inactive_with_offers issues
  const { data: resolved } = await supabaseAdmin
    .from('quality_issues')
    .select('product_id')
    .eq('rule_id', 'inactive_with_offers')
    .eq('status', 'resolved')
    .limit(60)
  const ids = ((resolved ?? []) as Array<{ product_id: string }>).map(r => r.product_id)
  if (ids.length > 0) {
    const { data: prods } = await supabaseAdmin.from('products').select('status, slug').in('id', ids)
    const byStatus = new Map<string, number>()
    for (const p of (prods ?? []) as Array<{ status: string }>) {
      byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1)
    }
    console.log('Resolved inactive_with_offers — current product statuses:', Object.fromEntries(byStatus))
  }
}
main().catch(console.error)
