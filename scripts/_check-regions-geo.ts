import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Check if latitude/longitude columns exist
  const { data, error } = await supabaseAdmin
    .from('regions')
    .select('slug, name, country_code')
    .limit(3)
  
  if (error) { console.error(error.message); return }
  console.log('COLUMNS:', Object.keys(data?.[0] ?? {}))
  
  // Also list all regions
  const { data: all } = await supabaseAdmin
    .from('regions')
    .select('slug, name, country_code')
    .order('country_code')
    .order('name')
  
  for (const r of (all ?? [])) {
    console.log(`  ${r.country_code} ${r.slug} — ${r.name}`)
  }
}
main().catch(console.error)
