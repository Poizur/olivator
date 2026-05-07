import { supabaseAdmin } from '@/lib/supabase'

const SUSPICIOUS_NAMES = [
  // Generic words that aren't brands
  'extra', 'picual', 'arbequina', 'koroneiki', 'frantoio', 'leccino',
  'p-d-o', 'pdo', 'dop', 'igp',
  'olivovy', 'oil', 'olive',
  'premium', 'luxury', 'gold',
  'darkove', 'gift',
  'bio', 'eko',
]

async function main() {
  const { data } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, status, country_code, description_long, founded_year, website_url')
    .order('name')

  const brands = (data ?? []) as Array<{
    id: string
    slug: string
    name: string
    status: string
    country_code: string | null
    description_long: string | null
    founded_year: number | null
    website_url: string | null
  }>

  // Per brand — produkty, fotky
  const flagged: typeof brands = []
  console.log('═══ BRANDS AUDIT ═══\n')

  for (const b of brands) {
    const { count: products } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('brand_slug', b.slug)
      .eq('status', 'active')
    const { count: photos } = await supabaseAdmin
      .from('entity_images')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', b.id)
      .eq('entity_type', 'brand')
      .eq('status', 'active')

    const issues: string[] = []
    const lower = b.slug.toLowerCase()
    if (SUSPICIOUS_NAMES.some(s => lower === s || lower.includes(s + '-') || lower.startsWith(s))) {
      issues.push('SUSPICIOUS NAME')
    }
    if (b.status === 'active' && (!b.description_long || b.description_long.length < 500)) issues.push('content < 500ch')
    if (b.status === 'active' && (photos ?? 0) === 0) issues.push('no photo')
    if (b.status === 'active' && !b.country_code) issues.push('no country')
    if ((products ?? 0) === 0) issues.push('0 products')
    if (b.status === 'active' && (products ?? 0) === 1) issues.push('only 1 product')

    const flag = issues.length > 0
    if (flag) flagged.push(b)
    const icon = flag ? '⚠️' : '✓'
    const desc = b.description_long ? `${b.description_long.length}ch` : 'NULL'
    const status = b.status.padEnd(8)
    const prods = String(products ?? 0).padStart(3)
    const pics = String(photos ?? 0).padStart(2)
    const country = b.country_code ?? '?? '
    console.log(`${icon} [${status}] ${b.slug.padEnd(28)} ${country} ${prods}p ${pics}foto ${desc.padEnd(8)} ${issues.join(', ')}`)
  }

  console.log(`\n═══ Souhrn ═══`)
  console.log(`Celkem brandů: ${brands.length}`)
  console.log(`Aktivní: ${brands.filter(b => b.status === 'active').length}`)
  console.log(`Draft: ${brands.filter(b => b.status === 'draft').length}`)
  console.log(`S problémy: ${flagged.length}`)
  if (flagged.length > 0) {
    console.log(`\nProblematické brandy:`)
    flagged.forEach(b => console.log(`  • ${b.slug} (${b.status}) — ${b.name}`))
  }
}
main().catch(console.error)
