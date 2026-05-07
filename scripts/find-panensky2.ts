import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Group products by brand_slug a count
  const { data } = await supabaseAdmin.from('products').select('brand_slug').not('brand_slug', 'is', null)
  const counts = new Map<string, number>()
  ;(data ?? []).forEach((p: { brand_slug: string | null }) => {
    if (p.brand_slug) counts.set(p.brand_slug, (counts.get(p.brand_slug) ?? 0) + 1)
  })
  // Sort by count desc, show all
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  for (const [slug, n] of sorted) {
    if (n >= 8 || slug.toLowerCase().includes('panen')) console.log(`${slug.padEnd(35)} ${n}`)
  }
}
main().catch(console.error)
