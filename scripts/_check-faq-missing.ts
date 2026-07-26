import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug, title, body_markdown')
    .eq('status', 'active')
  
  const missing = []
  for (const a of (articles ?? [])) {
    if (!a.body_markdown?.includes('## FAQ') && !a.body_markdown?.includes('**Jaký\|**Jak \|**Proč\|**Kde \|**Co ')) {
      missing.push({ slug: a.slug, title: a.title })
    }
  }
  console.log('Missing FAQ sections:')
  for (const m of missing) console.log(`  ${m.slug}`)
  
  // Check entity FAQ sample — format
  const { data: efaqs } = await supabaseAdmin
    .from('entity_faqs')
    .select('entity_type, question, answer')
    .limit(8)
  
  console.log('\nEntity FAQ sample (format check):')
  for (const f of (efaqs ?? [])) {
    console.log(`  [${f.entity_type}] ${f.question.slice(0, 60)}`)
  }
}
main().catch(console.error)
