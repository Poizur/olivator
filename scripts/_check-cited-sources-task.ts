import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('seo_tasks')
    .select('task_key, title, description, notes')
    .eq('task_key', 'cited_sources')
    .single()
  console.log(JSON.stringify(data, null, 2))
  
  // Also check which articles are vzdelavani/zdravi (most need citations)
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug, title, category, body_markdown')
    .in('category', ['vzdelavani'])
    .eq('status', 'active')
    .order('slug')
  
  console.log('\nVzdělávací články:')
  for (const a of (articles ?? [])) {
    const hasCitations = a.body_markdown?.includes('## Zdroje') || a.body_markdown?.includes('pubmed') || a.body_markdown?.includes('doi.org')
    console.log(`  ${hasCitations ? '✓' : '✗'} ${a.slug}`)
  }
}
main().catch(console.error)
