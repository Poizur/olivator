import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('articles').select('body_markdown').eq('slug', 'olivovy-olej-z-pokrutin').single()
  const lines = (data?.body_markdown ?? '').split('\n').filter(l => l.includes('liofyto'))
  console.log('DB tokens:', lines)
}
main().catch(e => { console.error(e); process.exit(1) })
