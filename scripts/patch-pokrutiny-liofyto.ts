import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: article, error: fe } = await supabaseAdmin
    .from('articles')
    .select('slug, body_markdown')
    .eq('slug', 'olivovy-olej-z-pokrutin')
    .single()
  if (fe || !article) { console.error('fetch:', fe?.message); return }

  const OLD = '{{product:olivovy-olej-z-pokrutin-liofyto-1-l-pet}}'
  const NEW = '{{product:olivovy-olej-z-pokrutin-liofyto-5-l-pet}}'

  if (!article.body_markdown.includes(OLD)) {
    console.log('Token nenalezen — nic k PATCHi.')
    return
  }

  const updated = article.body_markdown.replace(OLD, NEW)
  const { error: ue } = await supabaseAdmin
    .from('articles')
    .update({ body_markdown: updated, updated_at: new Date().toISOString() })
    .eq('slug', 'olivovy-olej-z-pokrutin')
  if (ue) { console.error('update:', ue.message); return }

  console.log(`PATCH OK: ${OLD}`)
  console.log(`        → ${NEW}`)
}
main().catch(e => { console.error(e); process.exit(1) })
