import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  for (const slug of ['frantoio', 'leccino', 'olivastra']) {
    const { data: links } = await supabaseAdmin
      .from('product_cultivars')
      .select('product_id')
      .eq('cultivar_slug', slug)
    const ids = (links ?? []).map((l: { product_id: string }) => l.product_id)
    if (ids.length === 0) {
      console.log(`  ${slug}: 0 products linked`)
      continue
    }
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, status')
      .in('id', ids)
    const active = (products ?? []).filter((p: { status: string }) => p.status === 'active')
    console.log(`  ${slug}: ${ids.length} linked, ${active.length} active`)
  }
}
main().catch(console.error)
