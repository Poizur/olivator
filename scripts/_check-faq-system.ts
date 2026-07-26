import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Check FAQ table structure
  const { data: sample } = await supabaseAdmin
    .from('faqs')
    .select('*')
    .limit(3)
  
  if (sample?.[0]) {
    console.log('FAQ table columns:', Object.keys(sample[0]).join(', '))
    console.log('Sample:', JSON.stringify(sample[0], null, 2))
  }
  
  const { count } = await supabaseAdmin.from('faqs').select('*', { count: 'exact', head: true })
  console.log('\nTotal FAQs:', count)
  
  // Check entity_faqs if exists
  const { data: efaq } = await supabaseAdmin
    .from('entity_faqs')
    .select('entity_type, question')
    .limit(3)
  if (efaq) {
    console.log('\nEntity FAQ sample:', JSON.stringify(efaq, null, 2))
  }
}
main().catch(console.error)
