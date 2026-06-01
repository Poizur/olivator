import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!
)
const { data, error } = await sb.from('articles')
  .select('slug, status, meta_title, meta_description, body_markdown')
  .eq('slug', 'olivovy-olej-na-plet-a-vlasy').single()
if (error || !data) { console.error(error); process.exit(1) }
console.log('META_TITLE:', data.meta_title, `(${data.meta_title?.length}ch)`)
console.log('META_DESC:', data.meta_description, `(${data.meta_description?.length}ch)`)
console.log('STATUS:', data.status, '| BODY_LEN:', data.body_markdown.length)
console.log('\n---BODY---\n')
console.log(data.body_markdown)
