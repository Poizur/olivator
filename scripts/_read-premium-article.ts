import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
async function main() {
  const { data } = await supabase.from('articles').select('body_markdown').eq('slug', 'premium-olivovy-olej-ma-smysl').single()
  console.log(data?.body_markdown)
}
main().catch(e => { console.error(e); process.exit(1) })
