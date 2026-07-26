import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: cols } = await supabaseAdmin
    .from('entity_faqs')
    .select('*')
    .limit(1)
  
  if (cols?.[0]) console.log('Columns:', Object.keys(cols[0]).join(', '))
  
  const { count } = await supabaseAdmin
    .from('entity_faqs')
    .select('*', { count: 'exact', head: true })
  console.log('Total entity_faqs:', count)
  
  // Check article FAQs in articles body 
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug, body_markdown')
    .eq('status', 'active')
    .limit(30)
  
  let hasFaq = 0
  let noFaq = 0
  for (const a of (articles ?? [])) {
    if (a.body_markdown?.includes('## FAQ') || a.body_markdown?.includes('**') && a.body_markdown?.includes('?')) hasFaq++
    else noFaq++
  }
  console.log(`\nArticles with FAQ section: ${hasFaq}/${(articles ?? []).length}`)
}
main().catch(console.error)
