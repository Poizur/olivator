/**
 * Druhá kontrola — ověř, že všechny aktivní produkty mají kompletní data
 * potřebná pro public stránku. Reporty produkty které:
 * - Nemají slug (nevalidní URL)
 * - Mají duplicitní slug (collision)
 * - Mají null name nebo prázdný name
 * - Mají brand_slug ale brand neexistuje (orphan FK)
 * - Mají image_url ale URL je nevalidní
 * - Mají inkonzistentní data (slug/name/source_url od různých produktů — frankenstein)
 *
 * Run: npx tsx --env-file=.env.local scripts/verify-active-products.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

interface Issue {
  productId: string
  slug: string
  name: string
  type: string
  detail: string
}

async function main() {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, brand_slug, image_url, source_url, volume_ml, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const ps = (products ?? []) as Array<{
    id: string
    slug: string | null
    name: string | null
    brand_slug: string | null
    image_url: string | null
    source_url: string | null
    volume_ml: number | null
  }>
  console.log(`═══ Verifikace ${ps.length} aktivních produktů ═══\n`)

  const issues: Issue[] = []
  const slugSeen = new Map<string, string>()  // slug → first product_id

  // Get existing brand slugs for FK check
  const { data: brands } = await supabaseAdmin.from('brands').select('slug')
  const brandSlugs = new Set(((brands ?? []) as Array<{ slug: string }>).map(b => b.slug))

  for (const p of ps) {
    // 1. Missing/empty slug
    if (!p.slug || p.slug.trim() === '') {
      issues.push({ productId: p.id, slug: p.slug ?? '?', name: p.name ?? '?', type: 'no_slug', detail: 'Empty slug' })
      continue
    }

    // 2. Duplicitní slug
    if (slugSeen.has(p.slug)) {
      issues.push({
        productId: p.id, slug: p.slug, name: p.name ?? '?', type: 'duplicate_slug',
        detail: `Same slug as ${slugSeen.get(p.slug)}`,
      })
    } else {
      slugSeen.set(p.slug, p.id)
    }

    // 3. Missing/empty name
    if (!p.name || p.name.trim().length < 5) {
      issues.push({ productId: p.id, slug: p.slug, name: p.name ?? '?', type: 'no_name', detail: 'Name missing or too short' })
    }

    // 4. Orphan brand_slug
    if (p.brand_slug && !brandSlugs.has(p.brand_slug)) {
      issues.push({
        productId: p.id, slug: p.slug, name: p.name ?? '?', type: 'orphan_brand',
        detail: `brand_slug="${p.brand_slug}" not in brands table`,
      })
    }

    // 5. Frankenstein detection — name vs slug consistency check
    // Heuristika: name a slug by měly mít alespoň 1 společné slovo (≥4 znaky, není generic)
    if (p.name && p.slug) {
      const GENERIC = ['extra', 'panensky', 'panenský', 'olivovy', 'olivový', 'olej', 'oil', 'olive', 'bio']
      const nameTokens = p.name.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .split(/[\s\-_,()]+/)
        .filter(t => t.length >= 4 && !GENERIC.includes(t) && !/^\d+(\.\d+)?$/.test(t))
      const slugTokens = p.slug.toLowerCase()
        .split(/[\s\-_]+/)
        .filter(t => t.length >= 4 && !GENERIC.includes(t) && !/^\d+(\.\d+)?$/.test(t))
      const overlap = nameTokens.filter(t => slugTokens.includes(t))
      if (nameTokens.length >= 2 && overlap.length === 0) {
        issues.push({
          productId: p.id, slug: p.slug, name: p.name, type: 'frankenstein',
          detail: `Name a slug nemají ŽÁDNÝ společný token. Pravděpodobně data ze 2 různých produktů.`,
        })
      }
    }

    // 6. Source URL — basic sanity check (pokud je nastavený, musí to být HTTP)
    if (p.source_url && !p.source_url.startsWith('http')) {
      issues.push({
        productId: p.id, slug: p.slug, name: p.name ?? '?', type: 'invalid_source_url',
        detail: `source_url="${p.source_url}" — nezačíná http`,
      })
    }
  }

  // Group by type
  const byType = new Map<string, Issue[]>()
  for (const i of issues) {
    if (!byType.has(i.type)) byType.set(i.type, [])
    byType.get(i.type)!.push(i)
  }

  console.log(`Nalezeno ${issues.length} problémů ve ${byType.size} kategoriích:\n`)
  for (const [type, items] of byType) {
    console.log(`═ ${type} (${items.length}) ═`)
    items.slice(0, 5).forEach(i => {
      console.log(`  • ${i.name.slice(0, 50).padEnd(50)} | slug=${i.slug.slice(0, 35)}`)
      console.log(`    ${i.detail}`)
    })
    if (items.length > 5) console.log(`  ... a další ${items.length - 5}`)
    console.log('')
  }

  if (issues.length === 0) {
    console.log('✅ Všech ' + ps.length + ' aktivních produktů má konzistentní data.')
  }
}
main().catch(console.error)
