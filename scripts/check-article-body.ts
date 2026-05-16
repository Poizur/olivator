import { supabaseAdmin } from '../lib/supabase'

async function main() {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('slug, status, source, body_markdown')
    .eq('slug', 'recky-vs-italsky')
    .single()
  
  if (error) { console.error(error.message); return }
  console.log('status:', data.status)
  console.log('source:', data.source)
  console.log('body start:', (data.body_markdown as string)?.slice(0, 80))
}
main().catch(console.error)
