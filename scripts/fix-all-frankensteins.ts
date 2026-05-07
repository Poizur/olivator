/**
 * Pro všechny aktivní produkty kde slug a name nesdílí žádný common token,
 * regeneruj slug z aktuálního name (pravdivý zdroj — scraper updatuje name
 * z source_url, ale slug se nepřegeneruje při upsertu).
 */
import { supabaseAdmin } from '@/lib/supabase'

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const GENERIC = ['extra', 'panensky', 'panenský', 'olivovy', 'olivový', 'olej', 'oil', 'olive', 'bio']

async function main() {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name')
    .eq('status', 'active')

  const ps = (products ?? []) as Array<{ id: string; slug: string; name: string }>
  let fixed = 0

  for (const p of ps) {
    const nameTokens = p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[\s\-_,()]+/).filter(t => t.length >= 4 && !GENERIC.includes(t) && !/^\d+(\.\d+)?$/.test(t))
    const slugTokens = p.slug.toLowerCase().split(/[\s\-_]+/).filter(t => t.length >= 4 && !GENERIC.includes(t) && !/^\d+(\.\d+)?$/.test(t))
    const overlap = nameTokens.filter(t => slugTokens.includes(t))
    if (nameTokens.length < 2 || overlap.length > 0) continue

    // Frankenstein — regeneruj slug z name
    const newSlug = slugify(p.name)
    if (!newSlug || newSlug.length < 5) continue

    // Check uniqueness
    const { data: existing } = await supabaseAdmin.from('products').select('id').eq('slug', newSlug).neq('id', p.id).maybeSingle()
    const finalSlug = existing ? `${newSlug}-${p.id.slice(0, 6)}` : newSlug

    await supabaseAdmin.from('products').update({
      slug: finalSlug,
      image_url: null,  // stale image z předchozího názvu
      updated_at: new Date().toISOString(),
    }).eq('id', p.id)

    // Smaž stale images
    await supabaseAdmin.from('product_images').delete().eq('product_id', p.id)

    console.log(`  ✓ ${p.name.slice(0, 50).padEnd(50)} → slug ${finalSlug}`)
    fixed++
  }
  console.log(`\n✅ ${fixed} produktů opraveno (slug regenerated z name, stale images smazány)`)
}
main().catch(console.error)
