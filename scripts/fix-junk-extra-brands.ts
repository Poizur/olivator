import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Mapping: slug → správný name
  const fixes: Record<string, string> = {
    mainova: 'Mainova',
    pocas: 'Pocas',
    quinta: 'Quinta do Pôpa',
  }
  for (const [slug, name] of Object.entries(fixes)) {
    const { error } = await supabaseAdmin.from('brands').update({ name, country_code: 'PT', updated_at: new Date().toISOString() }).eq('slug', slug)
    console.log(error ? `✗ ${slug}: ${error.message}` : `✓ ${slug} → ${name} (PT)`)
  }

  // ochuceny → toto jsou flavored variants brandu Agrocreta. Vytvoř/použij agrocreta brand
  const { data: existing } = await supabaseAdmin.from('brands').select('id').eq('slug', 'agrocreta').maybeSingle()
  if (!existing) {
    await supabaseAdmin.from('brands').insert({
      slug: 'agrocreta',
      name: 'Agrocreta',
      country_code: 'GR',
      status: 'draft',
    })
    console.log('✓ Created agrocreta brand')
  }
  // Update products from ochuceny → agrocreta
  const { error: e1 } = await supabaseAdmin.from('products').update({ brand_slug: 'agrocreta' }).eq('brand_slug', 'ochuceny')
  if (!e1) console.log('✓ Products ochuceny → agrocreta')
  // Smaz ochuceny brand
  await supabaseAdmin.from('brands').delete().eq('slug', 'ochuceny')
  console.log('✓ ochuceny smazán')

  // Také "panensky" brandy — podobný problém
  const { data: panensky } = await supabaseAdmin
    .from('brands')
    .select('slug')
    .or('name.ilike.panensky,name.ilike.panenský,slug.ilike.panensk%')
  console.log(`\nPanenský brandy: ${(panensky ?? []).length}`)
  for (const b of (panensky ?? []) as Array<{ slug: string }>) {
    const { data: products } = await supabaseAdmin.from('products').select('slug, name').eq('brand_slug', b.slug).limit(5)
    console.log(`  ${b.slug}: ${(products ?? []).length} produktů`)
    ;(products ?? []).slice(0, 3).forEach((p: { name: string }) => console.log(`    • ${p.name.slice(0,70)}`))
  }
}
main().catch(console.error)
