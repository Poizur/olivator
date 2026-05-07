/**
 * Audit alt textů produktových fotek. Generický alt = jen název produktu nebo
 * nic. Ideální alt = název + region + země + případně typ (EVOO, BIO).
 */
import { supabaseAdmin } from '@/lib/supabase'

interface ImageRow {
  id: string
  product_id: string
  url: string
  alt_text: string | null
  is_primary: boolean
  product_name?: string
  product_origin_country?: string | null
  product_origin_region?: string | null
}

async function main() {
  // Get all primary images joined with product info
  const { data, error } = await supabaseAdmin
    .from('product_images')
    .select(`
      id, product_id, url, alt_text, is_primary,
      products!inner(name, origin_country, origin_region, status)
    `)
    .eq('is_primary', true)

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  const rows = (data ?? []) as unknown as Array<ImageRow & { products: { name: string; origin_country: string | null; origin_region: string | null; status: string } }>
  const active = rows.filter(r => r.products.status === 'active')

  let nullAlt = 0
  let genericAlt = 0
  let goodAlt = 0
  let withRegion = 0

  for (const r of active) {
    if (!r.alt_text) {
      nullAlt++
      continue
    }
    const alt = r.alt_text.toLowerCase()
    const name = r.products.name.toLowerCase()
    // Generic = alt is exactly the name (or close to it) without extra context
    if (alt === name || alt.length < 15) genericAlt++
    else if (
      (r.products.origin_region && alt.includes(r.products.origin_region.toLowerCase())) ||
      (r.products.origin_country && alt.includes(r.products.origin_country.toLowerCase()))
    ) {
      withRegion++
      goodAlt++
    } else {
      goodAlt++
    }
  }

  console.log(`\nALT TEXT AUDIT — primary images, active products only`)
  console.log(`  Total: ${active.length}`)
  console.log(`  NULL alt:        ${nullAlt}`)
  console.log(`  Generic (< 15ch):${genericAlt}`)
  console.log(`  Has region/country: ${withRegion}`)
  console.log(`  OK (other):      ${goodAlt - withRegion}`)

  // Show 5 examples of each category
  console.log(`\nExamples generic alt:`)
  active.filter(r => r.alt_text && r.alt_text.length < 15).slice(0, 5).forEach(r => {
    console.log(`  ${r.products.name.slice(0, 40).padEnd(40)} alt: "${r.alt_text}"`)
  })

  console.log(`\nExamples NULL alt:`)
  active.filter(r => !r.alt_text).slice(0, 5).forEach(r => {
    console.log(`  ${r.products.name.slice(0, 40).padEnd(40)} alt: NULL`)
  })
}

main().catch(console.error)
