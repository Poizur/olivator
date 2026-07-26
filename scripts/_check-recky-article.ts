import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('slug, title, excerpt, source, published_at, body_markdown')
    .eq('slug', 'recky-vs-italsky')
    .single()
  if (error) { console.log('NOT FOUND:', error.message); return }
  console.log('FOUND:', data.title)
  console.log('source:', data.source)
  console.log('published_at:', data.published_at)
  console.log('body length:', data.body_markdown?.length)
  console.log('excerpt:', data.excerpt)
}
main().catch(console.error)
