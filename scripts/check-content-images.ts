import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug, title, hero_image_url, status')
    .order('slug')
  const { data: recipes } = await supabaseAdmin
    .from('recipes')
    .select('slug, title, hero_image_url, status')
    .order('slug')

  const arts = (articles ?? []) as Array<{ slug: string; title: string; hero_image_url: string | null; status: string }>
  const recs = (recipes ?? []) as Array<{ slug: string; title: string; hero_image_url: string | null; status: string }>

  console.log('═══ Články ═══')
  arts.forEach(a => {
    const img = a.hero_image_url ? '✅' : '❌'
    console.log(`  ${img} [${a.status}] ${a.slug}`)
  })
  console.log(`  CELKEM: ${arts.length}, s obrázkem: ${arts.filter(a => a.hero_image_url).length}, chybí: ${arts.filter(a => !a.hero_image_url).length}`)

  console.log('\n═══ Recepty ═══')
  recs.forEach(r => {
    const img = r.hero_image_url ? '✅' : '❌'
    console.log(`  ${img} [${r.status}] ${r.slug}`)
  })
  console.log(`  CELKEM: ${recs.length}, s obrázkem: ${recs.filter(r => r.hero_image_url).length}, chybí: ${recs.filter(r => !r.hero_image_url).length}`)
}
main().catch(console.error)
