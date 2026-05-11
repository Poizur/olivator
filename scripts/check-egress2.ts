import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data: products, error } = await supabaseAdmin.from('products').select('image_url').limit(500)
  console.log('Products query:', products?.length ?? 0, 'rows, error:', error?.message ?? 'none')
  const counters: Record<string, number> = {}
  let nullCount = 0
  for (const p of (products ?? []) as Array<{ image_url: string | null }>) {
    if (!p.image_url) { nullCount++; continue }
    try { counters[new URL(p.image_url).hostname] = (counters[new URL(p.image_url).hostname] ?? 0) + 1 } catch {}
  }
  console.log(`null image_url: ${nullCount}`)
  console.log('Hosts:', counters)
}
main().catch(console.error)
