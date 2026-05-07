import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('products').select('*').eq('id', 'f687d2b3-a022-4f40-a3eb-af4b576e57cf').maybeSingle()
  if (!data) { console.log('GONE'); return }
  const p = data as Record<string, unknown>
  console.log('Current state:')
  console.log('  status:', p.status)
  console.log('  status_changed_by:', p.status_changed_by)
  console.log('  status_changed_at:', p.status_changed_at)
  console.log('  updated_at:', p.updated_at)
  console.log('  slug:', p.slug)
  console.log('  name:', p.name)
  console.log('  source_url:', p.source_url)
}
main().catch(console.error)
