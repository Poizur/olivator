import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { data } = await supabaseAdmin.from('rankings').select('slug, product_slugs').eq('slug', 'nejlepsi-olivovy-olej-do-200-kc').maybeSingle()
  console.log('Ranking:', data)
}
main().catch(console.error)
