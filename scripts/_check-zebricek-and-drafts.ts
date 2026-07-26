import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // 1. Rankings DB
  const { data: rankings } = await supabaseAdmin
    .from('rankings')
    .select('slug, title, status')
    .order('created_at')
  console.log('=== RANKINGS ===')
  console.log(JSON.stringify(rankings?.map(r => ({ slug: r.slug, title: r.title, status: r.status })), null, 2))

  // 2. Check the specific slug
  const { data: r } = await supabaseAdmin
    .from('rankings')
    .select('*')
    .eq('slug', 'nejlepsi-olivovy-olej-2026')
    .maybeSingle()
  console.log('\n=== NEJLEPSI OLIVOVY OLEJ 2026 ===')
  console.log(r ? JSON.stringify({ slug: r.slug, status: r.status, product_slugs: r.product_slugs }) : 'NOT IN DB')

  // 3. Article drafts
  const { data: drafts } = await supabaseAdmin
    .from('article_drafts')
    .select('id, title, slug, status, created_at')
    .order('created_at')
  console.log('\n=== ARTICLE DRAFTS ===')
  console.log(JSON.stringify(drafts?.map(d => ({
    id: d.id.slice(0, 8),
    title: (d.title || '').slice(0, 65),
    slug: d.slug,
    status: d.status,
    date: d.created_at?.slice(0, 10),
  })), null, 2))
}

main().catch(console.error)
