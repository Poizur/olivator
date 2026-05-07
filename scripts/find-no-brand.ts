import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('products').select('id, slug, name').is('brand_slug', null).eq('status', 'active').limit(60)
  console.log(`${(data ?? []).length} produktů bez brand_slug`)
  // Try to find what brand each should be
  const candidates = new Map<string, string[]>()
  for (const p of (data ?? []) as Array<{ id: string; name: string; slug: string }>) {
    // Heuristics: extract brand from name
    // "... - Brand", "... Brand 250ml", "Brand product..."
    const cleaned = p.name.replace(/\d+\s*(ml|l|g)\b/gi, '').replace(/[,()]/g, '')
    // Try last few words
    const words = cleaned.split(/[\s\-]+/).filter(w => w.length >= 3)
    const lastWord = words[words.length - 1]?.replace(/[^\p{L}]/gu, '')
    if (lastWord) {
      if (!candidates.has(lastWord)) candidates.set(lastWord, [])
      candidates.get(lastWord)!.push(p.slug)
    }
  }
  // Sort by frequency
  const sorted = [...candidates.entries()].sort((a, b) => b[1].length - a[1].length)
  console.log('\nBrand candidates from last word:')
  sorted.slice(0, 20).forEach(([brand, slugs]) => console.log(`  ${brand} (${slugs.length}): ${slugs[0].slice(0, 50)}...`))
}
main().catch(console.error)
