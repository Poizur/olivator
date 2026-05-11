import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Count products with various image hosts
  const counters: Record<string, number> = {}
  const { data: products } = await supabaseAdmin.from('products').select('image_url').not('image_url', 'is', null)
  for (const p of (products ?? []) as Array<{ image_url: string }>) {
    try {
      const host = new URL(p.image_url).hostname
      counters[host] = (counters[host] ?? 0) + 1
    } catch {}
  }
  console.log('Product image_url hosts:')
  for (const [host, count] of [...Object.entries(counters)].sort((a,b) => b[1]-a[1])) {
    console.log(`  ${count.toString().padStart(4)} × ${host}`)
  }

  // Same for product_images
  const counters2: Record<string, number> = {}
  const { data: imgs } = await supabaseAdmin.from('product_images').select('url').not('url', 'is', null)
  for (const i of (imgs ?? []) as Array<{ url: string }>) {
    try {
      const host = new URL(i.url).hostname
      counters2[host] = (counters2[host] ?? 0) + 1
    } catch {}
  }
  console.log('\nproduct_images URL hosts:')
  for (const [host, count] of [...Object.entries(counters2)].sort((a,b) => b[1]-a[1])) {
    console.log(`  ${count.toString().padStart(4)} × ${host}`)
  }
}
main().catch(console.error)
