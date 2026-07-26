import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  // Find articles with {{product:slug}} tokens
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, title, body_markdown')
    .not('body_markdown', 'is', null)

  if (!articles) return

  // Extract all product tokens
  const tokenPattern = /\{\{product:([^}]+)\}\}/g

  for (const article of articles) {
    const body = article.body_markdown as string
    const tokens = [...body.matchAll(tokenPattern)].map(m => m[1])
    if (tokens.length === 0) continue

    console.log(`\n=== ${article.slug} (${tokens.length} tokens) ===`)

    // Check each token's product status
    for (const slug of [...new Set(tokens)]) {
      const { data: product } = await supabase
        .from('products')
        .select('slug, name, status, olivator_score')
        .eq('slug', slug)
        .single()

      const count = tokens.filter(t => t === slug).length
      if (!product) {
        console.log(`  [NOT FOUND x${count}] {{product:${slug}}}`)
      } else if (product.status !== 'active') {
        console.log(`  [${product.status.toUpperCase()} x${count}] {{product:${slug}}} — Score ${product.olivator_score} — "${product.name?.slice(0, 50)}"`)
      }
    }
  }

  // Also check articles with inline product links that might be inactive
  console.log('\n\n=== Checking /olej/ links in static article-bodies for inactive products ===')
  // This would need article-bodies.ts content, skip for now

  console.log('\nDone.')
}

main()
