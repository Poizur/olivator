import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function patchArticle(slug: string, replacements: [string, string][]) {
  const { data } = await supabase.from('articles').select('id, body_markdown').eq('slug', slug).single()
  if (!data) throw new Error(`${slug}: not found`)
  
  let body = data.body_markdown
  let changed = 0
  for (const [from, to] of replacements) {
    if (!body.includes(from)) {
      console.log(`  ⚠️  Pattern not found: "${from.slice(0, 60)}"`)
      continue
    }
    body = body.split(from).join(to)
    changed++
    console.log(`  ✓ "${from.slice(0, 60)}" → "${to.slice(0, 60)}"`)
  }
  
  if (changed === 0) return
  const { error } = await supabase.from('articles').update({ body_markdown: body, updated_at: new Date().toISOString() }).eq('id', data.id)
  if (error) throw error
}

async function main() {
  console.log('=== N-04: jak-vybrat-olivovy-olej ===')
  await patchArticle('jak-vybrat-olivovy-olej', [
    ['V Olivátoru sledujeme 33 prodejců a hodnotíme 439 olejů', 'V Olivátoru sledujeme 33 prodejců a hodnotíme přes 470 olejů'],
  ])
  
  console.log('\n=== N-05: nejlepsi-olivovy-olej-2026 ===')
  await patchArticle('nejlepsi-olivovy-olej-2026', [
    ['Prošli jsme celkem 439 produktů dostupných na českém trhu', 'Prošli jsme přes 470 produktů dostupných na českém trhu'],
    ['který agreguje 439 olejů z různých zdrojů', 'který agreguje přes 470 olejů z různých zdrojů'],
  ])
  
  console.log('\n✓ N-04/N-05 hotovo')
}
main().catch(e => { console.error(e); process.exit(1) })
