import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug, body_markdown')
    .eq('status', 'active')
  
  // Better check — look for question patterns
  const missing = []
  const hasIt = []
  for (const a of (articles ?? [])) {
    const b = a.body_markdown ?? ''
    const faqMarkers = [
      b.includes('## FAQ'),
      // pattern: bold text ending with ? (FAQ question format)
      /\*\*[^*]+\?\*\*/.test(b),
      // numbered FAQ
      /^\d+\.\s+\*\*/.test(b),
    ]
    if (faqMarkers.some(Boolean)) hasIt.push(a.slug)
    else missing.push(a.slug)
  }
  
  console.log(`Has FAQ: ${hasIt.length}`)
  console.log(`Missing FAQ: ${missing.length}`)
  console.log('Missing:', missing.join('\n  '))
}
main().catch(console.error)
