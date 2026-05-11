import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data: ps } = await supabaseAdmin.from('products').select('slug, name, source_url').eq('brand_slug', 'fumo')
  console.log(`Products s brand_slug=fumo: ${(ps ?? []).length}`)
  ;(ps ?? []).forEach((p: { slug: string; name: string; source_url: string | null }) =>
    console.log(`  ${p.name.slice(0, 70)}\n    src: ${p.source_url?.slice(0, 70) ?? '—'}`)
  )
}
main().catch(console.error)
