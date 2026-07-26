import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Get one article to see schema
  const { data } = await supabaseAdmin
    .from('articles')
    .select('*')
    .limit(1)
    .single()
  if (data) console.log('KEYS:', Object.keys(data).join(', '))
  console.log('SAMPLE:', JSON.stringify(data, null, 2).slice(0, 800))
}
main().catch(console.error)
