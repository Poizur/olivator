import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('slug, title, category, status, source, published_at')
    .order('published_at', { ascending: false })
  for (const a of (data ?? [])) {
    console.log(`${a.status.padEnd(10)} [${a.category}] ${a.slug}`)
  }
}
main().catch(console.error)
