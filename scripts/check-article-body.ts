import { supabaseAdmin } from '../lib/supabase'

async function main() {
  // Check all tables that could hold user-facing content
  const tables = [
    { table: 'articles', col: 'body_markdown' },
    { table: 'recipes', col: 'body_markdown' },
    { table: 'rankings', col: 'body_markdown' },
    { table: 'brands', col: 'description_long' },
    { table: 'brands', col: 'description_short' },
    { table: 'brands', col: 'tldr' },
    { table: 'brands', col: 'story' },
    { table: 'regions', col: 'description_long' },
    { table: 'regions', col: 'tldr' },
    { table: 'cultivars', col: 'description_long' },
    { table: 'cultivars', col: 'tldr' },
    { table: 'products', col: 'description_long' },
    { table: 'products', col: 'description_short' },
  ]

  for (const { table, col } of tables) {
    const { data, error } = await supabaseAdmin
      .from(table as any)
      .select(`slug, ${col}`)
      .ilike(col, '%TL;DR%')
      .limit(20)
    
    if (error) {
      if (!error.message.includes('does not exist')) console.error(`${table}.${col}:`, error.message)
      continue
    }
    if (data && data.length > 0) {
      console.log(`\n⚠️  ${table}.${col}: ${data.length} výskytů`)
      data.forEach((r: any) => console.log(`   slug: ${r.slug}`))
    }
  }
  console.log('\nDone.')
}
main().catch(console.error)
