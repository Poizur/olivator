import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('products').select('slug, name, status').eq('brand_slug', 'panensky')
  console.log(`Products s brand_slug='panensky': ${(data ?? []).length}`)
  ;(data ?? []).forEach((p: { slug: string; name: string; status: string }) => console.log(`  [${p.status}] ${p.name.slice(0,80)}`))

  // Check if brand exists
  const { data: brand } = await supabaseAdmin.from('brands').select('*').eq('slug', 'panensky').maybeSingle()
  console.log('\nBrand record:', brand ?? 'NEEXISTUJE — orphan FK')
}
main().catch(console.error)
