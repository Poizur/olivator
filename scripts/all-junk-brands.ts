import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const SUSPICIOUS = ['extra', 'panensky', 'panenský', 'olivovy', 'olive', 'premium', 'bio', 'p d o', 'pdo']
  const { data } = await supabaseAdmin.from('brands').select('slug, name, status, created_at')
  const junk = ((data ?? []) as Array<{ slug: string; name: string; status: string; created_at: string }>).filter(b => SUSPICIOUS.includes(b.name.toLowerCase().trim()))
  console.log(`${junk.length} junk brandů:`)
  junk.forEach(b => console.log(`  slug=${b.slug.padEnd(20)} name="${b.name}" status=${b.status} created=${b.created_at.slice(0,16)}`))

  // Find products
  for (const b of junk) {
    const { data: ps } = await supabaseAdmin.from('products').select('slug, name').eq('brand_slug', b.slug).limit(3)
    ;(ps ?? []).forEach((p: { slug: string; name: string }) => console.log(`    [${b.slug}] • ${p.name.slice(0, 60)}`))
  }
}
main().catch(console.error)
