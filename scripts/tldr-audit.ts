import { supabaseAdmin } from '../lib/supabase'

async function main() {
  const checks = [
    { table: 'articles', col: 'body_markdown' },
    { table: 'recipes', col: 'body_markdown' },
    { table: 'rankings', col: 'body_markdown' },
    { table: 'brands', col: 'description_long' },
    { table: 'brands', col: 'tldr' },
    { table: 'regions', col: 'description_long' },
    { table: 'regions', col: 'tldr' },
    { table: 'cultivars', col: 'description_long' },
    { table: 'cultivars', col: 'tldr' },
    { table: 'products', col: 'description_long' },
    { table: 'radar_items', col: 'czech_article' },
    { table: 'radar_items', col: 'czech_summary' },
  ]
  let total = 0
  for (const { table, col } of checks) {
    const { data, error } = await supabaseAdmin.from(table as any).select(`slug, ${col}`).ilike(col as any, '%TL;DR%').limit(50)
    if (error) { if (!error.message.includes('does not exist')) console.log(`${table}.${col}: ${error.message}`); continue }
    if (data?.length) {
      console.log(`⚠️  ${table}.${col}: ${data.length}`)
      data.forEach((r: any) => console.log(`   ${r.slug}`))
      total += data.length
    }
  }
  if (total === 0) console.log('✅ DB: 0 výskytů TL;DR')
}
main().catch(console.error)
