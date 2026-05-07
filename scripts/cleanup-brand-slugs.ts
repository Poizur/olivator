// Cleanup: re-extract brand_slug pro všechny produkty s novým extraktorem
// (lib/entity-extractor.ts) + smaž orphan brands (značky bez produktů).
//
// Důvod (user feedback 2026-05-07): admin filter ukazoval "značky" jako
// "Extra (16), Picual (11), 15 (2), 8 (1), Dárkové (1)" — generic words /
// cultivars / čísla. Starý extractBrand bral první slovo z názvu naivně.
//
// Spuštění:
//   npx tsx scripts/cleanup-brand-slugs.ts            # live
//   npx tsx scripts/cleanup-brand-slugs.ts --dry-run  # preview

import { supabaseAdmin } from '@/lib/supabase'
import { extractBrandSlug } from '@/lib/entity-extractor'

const DRY_RUN = process.argv.includes('--dry-run')

interface ProductRow {
  id: string
  name: string
  slug: string
  brand_slug: string | null
}

async function main() {
  console.log(DRY_RUN ? '🧪 DRY RUN' : '✏️  LIVE')

  // 1) Re-extract brand_slug pro všechny produkty
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, brand_slug')
    .returns<ProductRow[]>()

  if (error || !products) {
    console.error('Failed to fetch products:', error)
    process.exit(1)
  }

  console.log(`\nProcessing ${products.length} products...`)

  let changed = 0
  let cleared = 0   // brand_slug → null
  let unchanged = 0
  const newSlugCounts = new Map<string, number>()

  for (const p of products) {
    const newSlug = extractBrandSlug(p.name)
    if (newSlug === p.brand_slug) {
      unchanged++
      if (newSlug) newSlugCounts.set(newSlug, (newSlugCounts.get(newSlug) ?? 0) + 1)
      continue
    }

    if (newSlug) newSlugCounts.set(newSlug, (newSlugCounts.get(newSlug) ?? 0) + 1)

    if (newSlug == null && p.brand_slug != null) {
      cleared++
      console.log(`  [CLEAR] ${p.name.slice(0, 60).padEnd(60)} | ${p.brand_slug} → null`)
    } else {
      changed++
      console.log(`  [CHANGE] ${p.name.slice(0, 55).padEnd(55)} | ${p.brand_slug ?? 'null'} → ${newSlug}`)
    }

    if (!DRY_RUN) {
      await supabaseAdmin
        .from('products')
        .update({ brand_slug: newSlug, updated_at: new Date().toISOString() })
        .eq('id', p.id)
    }
  }

  console.log(`\n  Změněno:    ${changed}`)
  console.log(`  Vynulováno: ${cleared} (žádný validní brand v názvu)`)
  console.log(`  Beze změny: ${unchanged}`)

  // 2) Najdi orphan brands (žádný produkt) — kandidáti na smazání
  console.log('\n--- Orphan brands ---')
  const { data: brands } = await supabaseAdmin.from('brands').select('slug, name')
  const orphans = (brands ?? []).filter(b => !newSlugCounts.has(b.slug as string))
  if (orphans.length === 0) {
    console.log('  Žádné orphan brands.')
  } else {
    for (const b of orphans) {
      console.log(`  [ORPHAN] ${(b.slug as string).padEnd(25)} | ${b.name}`)
      if (!DRY_RUN) {
        await supabaseAdmin.from('brands').delete().eq('slug', b.slug as string)
      }
    }
    console.log(`  ${DRY_RUN ? 'Smazalo by se' : 'Smazáno'}: ${orphans.length} orphan brands`)
  }

  // 3) Zkontroluj že každý brand_slug má řádek v brands tabulce
  console.log('\n--- Missing brands (brand_slug bez záznamu v brands tabulce) ---')
  const existingBrandSlugs = new Set((brands ?? []).map(b => b.slug as string))
  const missing: string[] = []
  for (const slug of newSlugCounts.keys()) {
    if (!existingBrandSlugs.has(slug)) missing.push(slug)
  }
  if (missing.length === 0) {
    console.log('  Žádné chybějící brands.')
  } else {
    for (const slug of missing) {
      console.log(`  [MISSING] ${slug} (${newSlugCounts.get(slug)} produktů)`)
      if (!DRY_RUN) {
        // Vytvoř stub — admin ho doplní (description, website_url, atd.)
        await supabaseAdmin.from('brands').insert({
          slug,
          name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
          status: 'draft',
        })
      }
    }
    console.log(`  ${DRY_RUN ? 'Vytvořilo by se' : 'Vytvořeno'}: ${missing.length} brand stubs`)
  }

  console.log('\n--- Distribuce brand_slug ---')
  const sorted = [...newSlugCounts.entries()].sort((a, b) => b[1] - a[1])
  sorted.forEach(([s, c]) => console.log(`  ${s.padEnd(25)} ${c}`))
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
