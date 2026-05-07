/**
 * Aktivuje draft brandy které splňují kritéria:
 *   - ≥ 2 aktivních produktů (ne 1-shotky)
 *   - description_long > 500 znaků (má obsah)
 *   - aspoň 1 active entity_image (má fotku)
 *
 * Opt: --dry-run = jen ukáže kandidáty bez updatu.
 */
import { supabaseAdmin } from '@/lib/supabase'

const DRY = process.argv.includes('--dry-run')

interface Brand {
  id: string
  slug: string
  name: string
  status: string
  description_long: string | null
}

async function main() {
  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, status, description_long')
    .eq('status', 'draft')
    .order('slug')

  const all = (brands ?? []) as Brand[]

  let activated = 0
  let skipped = 0

  for (const brand of all) {
    const reasons: string[] = []

    // Check products
    const { count: productCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('brand_slug', brand.slug)
      .eq('status', 'active')
    if ((productCount ?? 0) < 2) reasons.push(`only ${productCount} products`)

    // Check content
    if (!brand.description_long || brand.description_long.length < 500) {
      reasons.push('content < 500ch')
    }

    // Check photo
    const { count: photoCount } = await supabaseAdmin
      .from('entity_images')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', brand.id)
      .eq('entity_type', 'brand')
      .eq('status', 'active')
    if ((photoCount ?? 0) < 1) reasons.push('no photo')

    if (reasons.length > 0) {
      console.log(`  ⏭️  ${brand.slug.padEnd(28)} skip: ${reasons.join(', ')}`)
      skipped++
      continue
    }

    if (DRY) {
      console.log(`  🟢 ${brand.slug.padEnd(28)} would activate (${productCount} prod, ${brand.description_long?.length}ch, ${photoCount} photo)`)
    } else {
      const { error } = await supabaseAdmin
        .from('brands')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', brand.id)
      if (error) {
        console.log(`  ❌ ${brand.slug}: ${error.message}`)
      } else {
        console.log(`  ✅ ${brand.slug.padEnd(28)} ACTIVATED (${productCount} prod, ${brand.description_long?.length}ch, ${photoCount} photo)`)
        activated++
      }
    }
  }

  console.log(`\nResult: ${DRY ? '(dry run) ' : ''}${activated} activated, ${skipped} skipped`)
}

main().catch(console.error)
