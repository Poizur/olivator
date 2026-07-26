import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('slug, body_markdown')
    .in('slug', ['jak-vybrat-olivovy-olej', 'dop-pgi-bio-certifikace', 'filtrovany-vs-nefiltrovany-olivovy-olej', 'jak-cist-etiketu-olivoveho-oleje'])
  
  for (const a of (data ?? [])) {
    const b = a.body_markdown ?? ''
    const faqStart = b.indexOf('## FAQ')
    if (faqStart >= 0) {
      console.log(`\n=== ${a.slug} FAQ section ===`)
      console.log(b.slice(faqStart, faqStart + 600))
    }
  }
}
main().catch(console.error)
