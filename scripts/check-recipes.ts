import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('recipes').select('slug, status, source').order('slug')
  ;(data ?? []).forEach((r: { slug: string; status: string; source: string }) =>
    console.log(' ', r.status.padEnd(8), r.source.padEnd(15), r.slug)
  )
  console.log('Total:', data?.length)
}
main().catch(console.error)
