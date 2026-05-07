import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { count } = await supabaseAdmin.from('rankings').select('*', { count: 'exact', head: true })
  const { data } = await supabaseAdmin.from('rankings').select('slug, title, status').order('position').limit(20)
  console.log('Total rankings:', count)
  ;(data ?? []).forEach((r: { slug: string; title: string; status: string }) =>
    console.log(' ', r.status.padEnd(8), r.slug)
  )
}
main().catch(console.error)
