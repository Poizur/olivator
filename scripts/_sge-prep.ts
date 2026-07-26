import { supabaseAdmin } from '@/lib/supabase'

// SGE prep: ensure key money-page articles have structured TL;DR at top
// and that first paragraphs directly answer the searcher's question
// We'll add a structured "Zkrátka:" summary after the H1 for top articles

const TLDR_UPDATES: Record<string, string> = {
  'jak-vybrat-olivovy-olej': 
    '> **Zkrátka:** Hledej EVOO (extra panenský), kyselost pod 0,4 %, polyfenoly nad 250 mg/kg a certifikaci DOP nebo BIO. Za kvalitní olej zaplaťte 25–50 Kč/100 ml.',
  'polyfenoly-kolik-je-dost':
    '> **Zkrátka:** EFSA doporučuje min. 5 mg hydroxytyrosolů denně — to odpovídá 20 ml EVOO s obsahem polyfenolů alespoň 250 mg/kg. High-polyphenol oleje mají 300–500+ mg/kg.',
  'extra-panensky-vs-panensky-vs-rafinovany':
    '> **Zkrátka:** Extra panenský (EVOO) = nejlepší, max 0,8 % kyselosti, plný polyfenolů. Panenský = podobný, nižší kvalita. Rafinovaný = bez polyfenolů, bez chuti. Olivový olej (bez přívlastku) = mix rafinovaného a panenského.',
  'olivovy-olej-a-zdravi-veda-2026':
    '> **Zkrátka:** Studie PREDIMED prokázala 30% snížení kardiovaskulárního rizika při středomořské dietě s EVOO. Klíčové: konzumovat 20–40 ml denně, ideálně za studena.',
  'falesny-olivovy-olej-jak-rozeznat':
    '> **Zkrátka:** Legitimní EVOO stojí min. 20–25 Kč/100 ml, má kyselost pod 0,8 % a nezmrzne v lednici (ale zamrznutí není zárukou pravosti). Nejbezpečnější: DOP nebo biologická certifikace.',
  'kde-koupit-olivovy-olej-cr':
    '> **Zkrátka:** Nejlepší ceny: Rohlík.cz, Košík.cz. Největší výběr EVOO: olivio.cz, olivovyolej.cz. Supermarkety (Albert, Kaufland): OK pro základní vaření, ne pro degustaci.',
}

async function main() {
  let updated = 0
  
  for (const [slug, tldr] of Object.entries(TLDR_UPDATES)) {
    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('id, body_markdown')
      .eq('slug', slug)
      .single()
    
    if (!article) { console.log(`❌ ${slug} nenalezeno`); continue }
    
    const body = article.body_markdown ?? ''
    // Skip if already has TL;DR or Zkrátka
    if (body.includes('**Zkrátka:**') || body.includes('> **Zkrátka')) {
      console.log(`⊘ ${slug} má Zkrátka`)
      continue
    }
    
    // Insert TL;DR after the first heading (## or #)
    const headingEnd = body.indexOf('\n', body.indexOf('#'))
    if (headingEnd < 0) { console.log(`⊘ ${slug} no heading`); continue }
    
    const newBody = body.slice(0, headingEnd + 1) + '\n' + tldr + '\n' + body.slice(headingEnd + 1)
    
    await supabaseAdmin
      .from('articles')
      .update({ body_markdown: newBody, updated_at: new Date().toISOString() })
      .eq('id', article.id)
    
    console.log(`✅ ${slug}`)
    updated++
  }
  
  console.log(`\nSGE Zkrátka přidáno: ${updated}/${Object.keys(TLDR_UPDATES).length}`)
  
  // Mark task done
  await supabaseAdmin.from('seo_tasks').update({ status: 'done' }).eq('task_key', 'sge_preparation')
  console.log('✅ sge_preparation → done')
}

main().catch(console.error)
