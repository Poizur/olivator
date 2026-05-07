/**
 * Najde draft brandy a kolik produktů mají. Brandy s 1+ aktivními produktem
 * jsou kandidáti na aktivaci (potřebují content + photo).
 */
import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('slug, name, status, description_long')
    .eq('status', 'draft')
    .order('slug')

  const all = (brands ?? []) as { slug: string; name: string; description_long: string | null }[]

  console.log(`\n${all.length} draft brandů\n`)
  console.log('SLUG'.padEnd(28), 'PRODUKTŮ', 'OBSAH', 'DOPORUČENÍ')
  console.log('─'.repeat(80))

  const candidates: string[] = []
  for (const b of all) {
    const { count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('brand_slug', b.slug)
      .eq('status', 'active')

    const productCount = count ?? 0
    const hasContent = !!b.description_long
    let action = ''
    if (productCount === 0) action = '─ skip (no products)'
    else if (productCount >= 2) {
      action = '✓ AKTIVOVAT (≥2 produkty)'
      candidates.push(b.slug)
    } else if (productCount === 1) action = '? zvážit (1 produkt)'

    console.log(
      b.slug.padEnd(28),
      String(productCount).padStart(8),
      (hasContent ? 'ano' : '—').padEnd(6),
      action
    )
  }

  if (candidates.length > 0) {
    console.log(`\n→ ${candidates.length} kandidátů na aktivaci:`)
    console.log(`  ${candidates.join(' ')}`)
  }
}

main().catch(console.error)
