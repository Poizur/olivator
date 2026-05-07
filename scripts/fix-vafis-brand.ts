import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Check if vafis brand exists
  const { data: existing } = await supabaseAdmin.from('brands').select('id').eq('slug', 'vafis').maybeSingle()
  if (!existing) {
    await supabaseAdmin.from('brands').insert({
      slug: 'vafis',
      name: 'Vafis',
      country_code: 'GR',
      status: 'draft',
    })
    console.log('✓ Created vafis brand')
  }
  // Move products
  const { data, error } = await supabaseAdmin.from('products').update({ brand_slug: 'vafis' }).eq('brand_slug', 'panensky').select('slug')
  console.log(`Products moved: ${(data ?? []).length}`, error?.message ?? '')
}
main().catch(console.error)
