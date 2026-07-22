// Draft Generator — Claude Sonnet generuje article draft ze keyword opportunity.
// Vstup: keyword + typ + focus_dimension (optional)
// Výstup: { title, slug, metaDescription, bodyMarkdown, wordCount }
//
// Delimiter output format (ne JSON) — vyhýbá se parse chybám z českých apostrofů v markdownu.

import { callClaude, extractText } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4500

export interface DraftResult {
  title: string
  slug: string
  metaDescription: string
  bodyMarkdown: string
  wordCount: number
}

function parseDelimited(text: string): DraftResult {
  function extract(tag: string): string {
    const open = `===${tag}===`
    const start = text.indexOf(open)
    if (start < 0) throw new Error(`Missing delimiter ${open}`)
    const contentStart = start + open.length
    // Next === starts the next tag
    const nextTag = text.indexOf('===', contentStart)
    return (nextTag > 0 ? text.slice(contentStart, nextTag) : text.slice(contentStart)).trim()
  }
  const title = extract('TITLE')
  const slug = extract('SLUG')
  const metaDescription = extract('META')
  const bodyMarkdown = extract('BODY')
  const wordCount = bodyMarkdown.split(/\s+/).filter(Boolean).length
  return { title, slug, metaDescription, bodyMarkdown, wordCount }
}

async function loadProductCatalog(keyword: string): Promise<string> {
  // Detekuj focus ze keyword pro tematický sort
  const kw = keyword.toLowerCase()
  let query = supabaseAdmin
    .from('products')
    .select(`slug, name, olivator_score, polyphenols, acidity, volume_ml, certifications, origin_country, product_offers!inner(retailers!inner(base_tracking_url, slug))`)
    .eq('status', 'active')
    .eq('type', 'evoo')
    .limit(15)

  if (kw.includes('polyfen') || kw.includes('antioxid')) {
    query = query.not('polyphenols', 'is', null).order('polyphenols', { ascending: false })
  } else if (kw.includes('lacin') || kw.includes('kysel')) {
    query = query.not('acidity', 'is', null).order('acidity', { ascending: true })
  } else if (kw.includes('bio') || kw.includes('organic')) {
    query = query.contains('certifications', ['bio']).order('olivator_score', { ascending: false })
  } else if (kw.includes('řeck') || kw.includes('greek')) {
    query = query.eq('origin_country', 'GR').order('olivator_score', { ascending: false })
  } else if (kw.includes('ital') || kw.includes('toskan')) {
    query = query.eq('origin_country', 'IT').order('olivator_score', { ascending: false })
  } else {
    query = query.order('olivator_score', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error('ProductCatalog: ' + error.message)

  const withAffiliate = (data ?? []).filter((p: any) =>
    (p.product_offers as any[]).some((o: any) => o.retailers?.base_tracking_url)
  )

  return withAffiliate.slice(0, 8).map((p: any) =>
    `${p.slug} | ${p.name} | score: ${p.olivator_score} | kyselost: ${p.acidity ?? '?'}% | polyfenoly: ${p.polyphenols ?? '?'} mg/kg | cert: ${JSON.stringify(p.certifications)} | země: ${p.origin_country}`
  ).join('\n') || '(žádné produkty s eHUB affiliate)'
}

async function loadLearnings(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('learnings')
    .select('code, title, rule')
    .in('code', ['L-002', 'L-006', 'L-007', 'L-009'])
  return (data ?? []).map((l: any) => `[${l.code}] ${l.title}\nPravidlo: ${l.rule}`).join('\n\n')
}

async function loadActiveArticles(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('slug, meta_title')
    .eq('status', 'active')
    .limit(50)
  return (data ?? []).map((a: any) => `${a.slug}: ${a.meta_title}`).join('\n') || '(žádné)'
}

function isYmylKeyword(keyword: string): boolean {
  const kw = keyword.toLowerCase()
  return ['spanek', 'spánek', 'zdrav', 'diabet', 'srdce', 'choles', 'krev', 'zánět', 'cancer', 'rakovi', 'hubnut', 'dieta'].some(t => kw.includes(t))
}

export async function generateDraft(
  keyword: string,
  opportunityType: 'striking_distance' | 'content_gap' | 'rising_query',
): Promise<DraftResult> {
  const [catalog, learnings, existingArticles] = await Promise.all([
    loadProductCatalog(keyword),
    loadLearnings(),
    loadActiveArticles(),
  ])

  console.log(`[draft-generator] Keyword: "${keyword}" | type: ${opportunityType}`)
  console.log(`[draft-generator] Katalog: ${catalog.split('\n').length} produktů s eHUB`)

  const ymyl = isYmylKeyword(keyword)
  const ymylBlock = ymyl ? `
YMYL PRAVIDLA (POVINNÉ — toto je zdravotní téma):
1. DOLOŽENÉ = má oporu ve studiích — uveď typ ("randomizovaná studie", "meta-analýza", "observační studie")
2. TRADICE = lidová víra bez vědeckého důkazu — explicitně označ: "tradičně se věří", "ve starší literatuře", "vědecky nepotvrzeno"
3. NIKDY nevymýšlet konkrétní studie, instituce, procentní čísla bez zdroje
4. Kauzální tvrzení ("X způsobuje Y") jen pokud je za nimi solidní evidence
5. Hedguj výroky: "naznačují", "studie ukazují že", "může přispívat k"
` : ''

  const prompt = `Jsi hlavní editor Olivator.cz — největší srovnávač olivových olejů v ČR. Piš přirozenou češtinou, aktivním hlasem.

RELEVANTNÍ LEKCE Z PAMĚTI (respektuj je):
${learnings || '(žádné)'}

EXISTUJÍCÍ AKTIVNÍ ČLÁNKY (kanibalizační check — nepřekrývej témata):
${existingArticles}

PRODUKT KATALOG (použi {{product:slug}} tokeny — jen tyto, eHUB retaileři s affiliate):
${catalog}

${ymylBlock}
ZAKÁZÁNO:
- Vymýšlet produkty nebo studie
- "prémiový zážitek", "výjimečná chuť" (marketing bez důkazu)
- Inline parametry vedle {{product:}} tokenů (score/kyselost/cena) — karta je zobrazí sama; napiš místo toho proč/kdy/pro koho je produkt vhodný
- Placeholdery [DOPLNIT]
- Pasivní hlas

ÚKOL: Napiš expertní článek pro klíčové slovo "${keyword}" (typ příležitosti: ${opportunityType}).
Délka: 800–1200 slov. Minimálně 2× H2 s LSI slovy. FAQ sekce (3 otázky, schema.org friendly). Affiliate CTA přirozené.

FORMAT ODPOVĚDI — pouze toto, žádný jiný text:
===TITLE===
H1 nadpis s klíčovým slovem přirozeně, max 65 znaků
===SLUG===
url-friendly-slug-bez-diakritiky
===META===
Max 155 znaků, klíčové slovo na začátku
===BODY===
Celý článek v markdownu
===END===`

  const response = await callClaude({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = extractText(response)
  if (!text.includes('===TITLE===')) {
    console.error('[draft-generator] Chybí delimiter ===TITLE===, první 300 znaků:', text.slice(0, 300))
    throw new Error('Draft generator: neplatný formát odpovědi (chybí delimitery)')
  }

  return parseDelimited(text)
}
