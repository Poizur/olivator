import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('body_markdown')
    .eq('slug', 'polyfenoly-kolik-je-dost')
    .single()
  
  const body = data?.body_markdown ?? ''
  // Find FAQ section
  const faqIdx = body.indexOf('**')
  console.log('Has ** marker:', body.includes('**'))
  console.log('Has FAQ:', body.includes('FAQ'))
  console.log('Last 800 chars:', body.slice(-800))
}
main().catch(console.error)
