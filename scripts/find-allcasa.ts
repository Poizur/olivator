import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('brands').select('slug, name').or('name.ilike.%casa%,slug.ilike.%casa%,name.ilike.%pdo%,slug.ilike.%pdo%,slug.ilike.%p-d-o%')
  console.log('Casa/Pdo brands:', data)

  const { data: all } = await supabaseAdmin.from('brands').select('slug, name').order('name')
  const labels = ((all ?? []) as Array<{ slug: string; name: string }>).map(b => b.name)
  // Find any with name length <= 6
  const short = ((all ?? []) as Array<{ slug: string; name: string }>).filter(b => b.name.length <= 6)
  console.log('\nShort name brands (≤6 chars):', short.map(b => `${b.slug}="${b.name}"`).join(', '))
}
main().catch(console.error)
