import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
async function main() {
  const { data } = await s.from('products').select('slug, name, flavor_labels, certifications, description_short').ilike('name', '%orino%').eq('status','active').limit(5)
  for (const p of data ?? []) {
    console.log(`\n--- ${p.name} ---`)
    console.log('slug:', p.slug)
    console.log('certs:', p.certifications)
    console.log('flavor_labels:', p.flavor_labels)
    console.log('desc:', p.description_short?.slice(0, 250))
  }
}
main().catch(console.error)
