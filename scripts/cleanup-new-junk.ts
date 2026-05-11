import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Investigate "ecoato" + "planete" stubs from latest cron
  for (const slug of ['ecoato', 'planete']) {
    const { data: b } = await supabaseAdmin.from('brands').select('id, slug, name, status').eq('slug', slug).maybeSingle()
    if (!b) continue
    const { data: ps } = await supabaseAdmin.from('products').select('id, slug, name').eq('brand_slug', slug).limit(5)
    const items = (ps ?? []) as Array<{ slug: string; name: string }>
    console.log(`\nBrand "${(b as { name: string }).name}" (slug=${slug}, status=${(b as { status: string }).status}, ${items.length} produktů):`)
    items.forEach(p => console.log(`  • ${p.name.slice(0, 70)}`))
  }
  // Plus aktuální stav junkSUSPICIOUS = ['extra', 'panensky', 'olivovy', 'olive', 'premium', 'bio', 'eko']
  const { data: brands } = await supabaseAdmin.from('brands').select('slug, name')
  const junk = ((brands ?? []) as Array<{ slug: string; name: string }>).filter(b => ['Extra', 'Panenský', 'Bio', 'Eko', 'Premium', 'Olive', 'Olej'].includes(b.name))
  if (junk.length > 0) {
    console.log(`\n⚠️ Junk brandů: ${junk.length}`)
    junk.forEach(b => console.log(`  slug=${b.slug} name="${b.name}"`))
  } else {
    console.log('\n✅ Žádné junk brandy (Extra/Bio/Premium)')
  }
}
main().catch(console.error)
