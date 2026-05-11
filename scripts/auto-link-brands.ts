/**
 * Smart brand linker — pro produkty s brand_slug=NULL hledá v product name
 * známé brand jména (z brands tabulky). Když najde match → link.
 *
 * Idempotentní. Match přes case-insensitive hledání slov delších než 3
 * znaky aby se nematchlo "BIO", "ml", atd.
 */
import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Load all known brands
  const { data: brands } = await supabaseAdmin.from('brands').select('slug, name')
  const knownBrands = ((brands ?? []) as Array<{ slug: string; name: string }>)
    .filter(b => b.name.length >= 3)
    .map(b => ({ slug: b.slug, nameLower: b.name.toLowerCase() }))
    // Sort by name length desc — match longer brands first ("Sitia Kréta" before "Sitia")
    .sort((a, b) => b.nameLower.length - a.nameLower.length)

  console.log(`Loaded ${knownBrands.length} known brands\n`)

  // Find unbranded products
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name')
    .is('brand_slug', null)
    .eq('status', 'active')

  const unbranded = (products ?? []) as Array<{ id: string; slug: string; name: string }>
  console.log(`${unbranded.length} unbranded active produktů\n`)

  let linked = 0
  const skipped: string[] = []

  for (const p of unbranded) {
    const nameLower = p.name.toLowerCase()
    // Find first matching brand (longest first thanks to sort)
    const match = knownBrands.find(b => {
      // Word-boundary match — nehleda "vafis" v "extravafis", musí být oddělené
      const re = new RegExp(`(?:^|[\\s\\-_,()])${b.nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[\\s\\-_,()]|$)`, 'i')
      return re.test(nameLower)
    })

    if (match) {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ brand_slug: match.slug, updated_at: new Date().toISOString() })
        .eq('id', p.id)
      if (!error) {
        linked++
        console.log(`  ✓ ${p.name.slice(0, 60).padEnd(60)} → ${match.slug}`)
      }
    } else {
      skipped.push(p.name.slice(0, 60))
    }
  }

  console.log(`\n═══ Result ═══`)
  console.log(`Linked: ${linked}/${unbranded.length}`)
  console.log(`Unmatched: ${skipped.length}`)
  if (skipped.length > 0) {
    console.log(`\nNelze automaticky určit brand:`)
    skipped.slice(0, 20).forEach(s => console.log(`  ✗ ${s}`))
  }
}
main().catch(console.error)
