import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: ed } = await supabaseAdmin.from('authors').select('id').eq('slug', 'olivator-redakce').maybeSingle()
  if (!ed) { console.error('No default author'); return }
  const authorId = (ed as { id: string }).id

  const { data: arts, error: e1 } = await supabaseAdmin.from('articles').update({ author_id: authorId }).is('author_id', null).select('slug')
  console.log('Articles backfilled:', arts?.length ?? 0, e1?.message ?? '')

  const { data: recs, error: e2 } = await supabaseAdmin.from('recipes').update({ author_id: authorId }).is('author_id', null).select('slug')
  console.log('Recipes backfilled:', recs?.length ?? 0, e2?.message ?? '')
}
main().catch(console.error)
