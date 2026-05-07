import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('articles').select('slug, status, source, title').order('created_at', { ascending: false })
  ;(data ?? []).forEach((r: { slug: string; status: string; source: string; title: string }) =>
    console.log(' ', r.status.padEnd(8), (r.source ?? '?').padEnd(15), r.slug)
  )
  console.log('Total:', data?.length, 'Drafts:', (data ?? []).filter((r: {status: string}) => r.status === 'draft').length)
}
main().catch(console.error)
