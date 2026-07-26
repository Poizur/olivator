import { supabaseAdmin } from '@/lib/supabase'
import { callClaude, extractText } from '@/lib/anthropic'

const HAIKU = 'claude-haiku-4-5-20251001'
const DELAY_MS = 2500

const SYSTEM = `Jsi editor Olivator.cz — srovnávač olivových olejů. Píšeš FAQ sekce pro SEO.
Vrátíš POUZE markdown FAQ sekci (žádný jiný text), přesně v tomto formátu:

## FAQ

### Otázka 1?

Odpověď (1-3 věty, faktická, přirozená čeština).

### Otázka 2?

Odpověď.

Pravidla: 4 otázky, přirozené konverzační otázky (voice-search friendly), krátké odpovědi (max 50 slov), bez marketingu.`

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function generateFaq(title: string, excerpt: string, topic: string): Promise<string | null> {
  const prompt = `Artikel: "${title}"
Anotace: ${excerpt}
Téma: ${topic}

Napiš 4 FAQ otázky relevantní k tomuto článku. Otázky musí být ve stylu, 
jak by je uživatel řekl hlasovému asistentovi nebo do Google.`

  const res = await callClaude({
    model: HAIKU,
    max_tokens: 600,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })
  return extractText(res).trim() || null
}

// Articles missing FAQ + their context
const ARTICLES_TO_FIX = [
  { slug: 'polyfenoly-kolik-je-dost', topic: 'kolik polyfenolů potřebuje člověk denně, kde je najít, jak je poznat' },
  { slug: 'stredomorska-strava-olivovy-olej', topic: 'středomořská dieta, olivový olej jako základ, zdravotní výhody' },
  { slug: 'extra-panensky-vs-panensky-vs-rafinovany', topic: 'rozdíl kategorií olivového oleje, EVOO vs panenský vs rafinovaný' },
  { slug: 'olivovy-olej-a-zdravi-veda-2026', topic: 'zdravotní účinky olivového oleje, vědecké studie, kardiovaskulární' },
  { slug: 'olivovy-olej-na-smazeni-bod-zakoureni', topic: 'smažení na olivovém oleji, bod zakouření, bezpečnost' },
  { slug: 'olivovy-olej-pro-deti', topic: 'olivový olej pro kojence a děti, bezpečnost, dávkování' },
  { slug: 'olivovy-olej-do-salatu-vs-na-vareni', topic: 'olivový olej do salátu vs na vaření, který typ kde používat' },
  { slug: 'sklizen-oliv-early-vs-late-harvest', topic: 'early harvest vs late harvest olivový olej, kdy sklízet olivy' },
  { slug: 'filtrovany-vs-nefiltrovany-olivovy-olej', topic: 'filtrovaný vs nefiltrovaný olivový olej, výhody a nevýhody' },
  { slug: 'jak-cist-etiketu-olivoveho-oleje', topic: 'čtení etikety olivového oleje, co znamenají různé označení' },
  { slug: 'jak-skladovat-olivovy-olej-doma', topic: 'skladování olivového oleje, teplota, světlo, trvanlivost' },
  { slug: 'otevrena-lahev-jak-rychle-spotrebovat', topic: 'otevřená lahev olivového oleje, jak rychle spotřebovat' },
  { slug: 'falesny-olivovy-olej-jak-rozeznat', topic: 'falšovaný olivový olej, jak poznat pravý olej, podvody' },
  { slug: 'degustace-olivoveho-oleje-doma', topic: 'jak degustovat olivový olej doma, co hodnotit' },
  { slug: 'kde-koupit-olivovy-olej-cr', topic: 'kde koupit kvalitní olivový olej v ČR, e-shopy, supermarkety' },
  { slug: 'premium-olivovy-olej-ma-smysl', topic: 'má cenu kupovat drahý olivový olej, rozdíl v kvalitě' },
  { slug: 'darkove-baleni-olivovy-olej', topic: 'olivový olej jako dárek, dárkové balení, jak vybrat' },
]

async function main() {
  let updated = 0
  
  for (let i = 0; i < ARTICLES_TO_FIX.length; i++) {
    const { slug, topic } = ARTICLES_TO_FIX[i]
    process.stdout.write(`[${i+1}/${ARTICLES_TO_FIX.length}] ${slug}... `)
    
    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('id, title, excerpt, body_markdown')
      .eq('slug', slug)
      .single()
    
    if (!article) { console.log('❌ nenalezeno'); continue }
    
    // Check if already has FAQ
    if (article.body_markdown?.includes('## FAQ')) {
      console.log('⊘ má FAQ')
      continue
    }
    
    try {
      const faqBlock = await generateFaq(article.title, article.excerpt ?? '', topic)
      if (!faqBlock) { console.log('❌ prázdná odpověď'); continue }
      
      // Insert FAQ before "## Zdroje" if it exists, otherwise append
      let newBody: string
      const sourcesIdx = article.body_markdown?.indexOf('\n## Zdroje') ?? -1
      if (sourcesIdx >= 0 && article.body_markdown) {
        newBody = article.body_markdown.slice(0, sourcesIdx) + '\n\n' + faqBlock + '\n' + article.body_markdown.slice(sourcesIdx)
      } else {
        newBody = (article.body_markdown ?? '') + '\n\n' + faqBlock
      }
      
      await supabaseAdmin
        .from('articles')
        .update({ body_markdown: newBody, updated_at: new Date().toISOString() })
        .eq('id', article.id)
      
      console.log('✅')
      updated++
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`)
    }
    
    if (i < ARTICLES_TO_FIX.length - 1) await sleep(DELAY_MS)
  }
  
  console.log(`\nHotovo: ${updated}/${ARTICLES_TO_FIX.length}`)
}

main().catch(console.error)
