/**
 * Aktivuje brand fotky pro intini a alfa které jsou inactive (přidány dříve
 * a omylem flagnuté jako inactive). Idempotentní.
 */
import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const slugs = ['intini', 'alfa']
  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('id, slug')
    .in('slug', slugs)

  if (!brands || brands.length === 0) {
    console.log('No brands found')
    return
  }

  for (const brand of brands as { id: string; slug: string }[]) {
    const { data: photos } = await supabaseAdmin
      .from('entity_images')
      .select('id, status')
      .eq('entity_id', brand.id)
      .eq('entity_type', 'brand')

    const inactive = (photos ?? []).filter((p: { status: string }) => p.status === 'inactive')
    if (inactive.length === 0) {
      console.log(`  ${brand.slug}: no inactive photos`)
      continue
    }

    // Activate the first inactive photo, mark as primary
    const first = inactive[0] as { id: string }
    const { error } = await supabaseAdmin
      .from('entity_images')
      .update({ status: 'active', is_primary: true })
      .eq('id', first.id)

    if (error) console.log(`  ${brand.slug}: ❌ ${error.message}`)
    else console.log(`  ${brand.slug}: ✅ activated photo ${first.id.slice(0, 8)}`)
  }
}

main().catch(console.error)
