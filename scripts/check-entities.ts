import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const [r, b, c] = await Promise.all([
    supabaseAdmin.from('regions').select('slug, name, description_long, status').order('slug'),
    supabaseAdmin.from('brands').select('slug, name, description_long, status').order('slug'),
    supabaseAdmin.from('cultivars').select('slug, name, description_long, status').order('slug'),
  ])
  console.log('REGIONS:')
  ;(r.data || []).forEach((x: { slug: string; description_long: string | null; status: string }) =>
    console.log(' ', x.slug, '|', x.description_long ? x.description_long.length + 'ch' : 'NULL', '|', x.status)
  )
  console.log('BRANDS:')
  ;(b.data || []).forEach((x: { slug: string; description_long: string | null; status: string }) =>
    console.log(' ', x.slug, '|', x.description_long ? x.description_long.length + 'ch' : 'NULL', '|', x.status)
  )
  console.log('CULTIVARS:')
  ;(c.data || []).forEach((x: { slug: string; description_long: string | null; status: string }) =>
    console.log(' ', x.slug, '|', x.description_long ? x.description_long.length + 'ch' : 'NULL', '|', x.status)
  )
}

main().catch(console.error)
