import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin
    .from('article_drafts')
    .select('id, title, slug, body_markdown')
    .in('slug', ['olivovy-olej-pred-spanim'])
  for (const d of data ?? []) {
    const hasTokens = (d.body_markdown || '').includes('{{product:')
    const len = (d.body_markdown || '').length
    console.log(`${d.id.slice(0,8)} | "${d.title}" | len=${len} | hasTokens=${hasTokens}`)
    // Print first 200 chars
    console.log((d.body_markdown || '').slice(0, 200))
    console.log('---')
  }
}
main().catch(console.error)
