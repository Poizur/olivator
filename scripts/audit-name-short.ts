/**
 * Audit name_short quality across active products.
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/audit-name-short.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

const GENERIC = new Set([
  'olivový', 'olej', 'extra', 'panenský', 'virgin',
  'evoo', 'bio', 'organic', 'olive', 'oil', 'premium',
  'olivova', 'olivové',
])

async function main() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, brand_slug, origin_country, certifications, volume_ml, olivator_score')
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })

  if (error || !products) {
    console.error('DB error:', error?.message)
    process.exit(1)
  }

  // Fetch brand names
  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('slug, name')

  const brandNameMap = new Map((brands ?? []).map(b => [b.slug as string, b.name as string]))

  const groups = {
    null_missing: [] as typeof products,
    too_short: [] as typeof products,
    generic: [] as typeof products,
    duplicate_brand: [] as typeof products,
    all_caps: [] as typeof products,
    ok: [] as typeof products,
  }

  for (const p of products) {
    const ns = p.name_short as string | null
    const brandName = p.brand_slug ? brandNameMap.get(p.brand_slug as string) ?? null : null

    if (!ns) {
      groups.null_missing.push(p)
    } else if (ns.length < 5) {
      groups.too_short.push(p)
    } else if (GENERIC.has(ns.toLowerCase().trim())) {
      groups.generic.push(p)
    } else if (brandName && ns.toLowerCase().trim() === brandName.toLowerCase().trim()) {
      groups.duplicate_brand.push(p)
    } else if (/^[A-Z0-9\s\-\.]+$/.test(ns) && ns.length > 3) {
      groups.all_caps.push(p)
    } else {
      groups.ok.push(p)
    }
  }

  const problematic = [
    ...groups.null_missing,
    ...groups.too_short,
    ...groups.generic,
    ...groups.duplicate_brand,
    ...groups.all_caps,
  ]

  console.log('\n═══════════════════════════════════════════')
  console.log('NAME_SHORT AUDIT REPORT')
  console.log('═══════════════════════════════════════════\n')
  console.log(`Total active products: ${products.length}`)
  console.log(`Problematic:          ${problematic.length} (${Math.round(problematic.length / products.length * 100)}%)`)
  console.log(`OK:                   ${groups.ok.length}\n`)

  console.log('─── Distribution ───────────────────────────')
  console.log(`  NULL / missing:   ${groups.null_missing.length}`)
  console.log(`  Too short (<5):   ${groups.too_short.length}`)
  console.log(`  Generic word:     ${groups.generic.length}`)
  console.log(`  Duplicate brand:  ${groups.duplicate_brand.length}`)
  console.log(`  ALL CAPS:         ${groups.all_caps.length}`)
  console.log('')

  const printGroup = (label: string, items: typeof products, limit = 7) => {
    if (items.length === 0) return
    console.log(`─── ${label} (${items.length}) ────────────────────────`)
    items.slice(0, limit).forEach(p => {
      const brand = p.brand_slug ? brandNameMap.get(p.brand_slug as string) ?? p.brand_slug : '—'
      console.log(`  [${p.olivator_score ?? '??'}] ${p.slug}`)
      console.log(`       brand: ${brand}`)
      console.log(`       name_short: "${p.name_short ?? 'NULL'}"`)
      console.log(`       name: "${(p.name as string).slice(0, 70)}"`)
    })
    if (items.length > limit) console.log(`  ... +${items.length - limit} dalších`)
    console.log('')
  }

  printGroup('NULL / MISSING', groups.null_missing)
  printGroup('TOO SHORT', groups.too_short)
  printGroup('GENERIC', groups.generic)
  printGroup('DUPLICATE BRAND', groups.duplicate_brand)
  printGroup('ALL CAPS', groups.all_caps)

  console.log('─── Top 20 problematic (by Score desc) ─────')
  problematic
    .sort((a, b) => ((b.olivator_score as number) ?? 0) - ((a.olivator_score as number) ?? 0))
    .slice(0, 20)
    .forEach((p, i) => {
      const brand = p.brand_slug ? brandNameMap.get(p.brand_slug as string) ?? p.brand_slug : '—'
      const issue = !p.name_short ? 'NULL'
        : (p.name_short as string).length < 5 ? 'SHORT'
        : GENERIC.has((p.name_short as string).toLowerCase().trim()) ? 'GENERIC'
        : (brandNameMap.get(p.brand_slug as string ?? '') ?? '').toLowerCase() === (p.name_short as string).toLowerCase() ? 'DUP_BRAND'
        : 'ALL_CAPS'
      console.log(`  ${String(i + 1).padStart(2)}. [Score ${p.olivator_score ?? '??'}] [${issue}] ${p.slug}`)
      console.log(`      Brand: ${brand} | name_short: "${p.name_short ?? 'NULL'}"`)
    })
}

main().catch(e => { console.error(e); process.exit(1) })
