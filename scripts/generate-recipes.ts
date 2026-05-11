/**
 * Bulk AI generování pro Fáze 4 — recipes do /recept.
 * 10 nových receptů s product placement a strukturovanými ingredients/steps.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/generate-recipes.ts
 *   npx tsx --env-file=.env.local scripts/generate-recipes.ts --slug=caprese
 */
import { supabaseAdmin } from '@/lib/supabase'
import { callClaude, extractText } from '@/lib/anthropic'
import { searchUnsplash } from '@/lib/unsplash'

const TARGET_SLUG = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1]
const SKIP_EXISTING = !process.argv.includes('--force')

interface RecipeBrief {
  slug: string
  title: string
  excerpt: string
  emoji: string
  cuisine: 'italian' | 'greek' | 'spanish' | 'french' | 'mediterranean'
  difficulty: 'easy' | 'medium' | 'hard'
  recommendedCultivars: string[]   // slugs from cultivars table
  recommendedRegions: string[]      // slugs from regions table
  briefAngle: string                // co je důležité na tomto receptu
  unsplashQuery: string             // BUG-014 prevention
}

const RECIPE_BRIEFS: RecipeBrief[] = [
  {
    slug: 'caprese-salat',
    title: 'Caprese salát s mozzarellou',
    excerpt: 'Tři ingredience, žádné triky. Kvalita olivového oleje dělá z banální kombinace rajče-mozzarella ikonický italský zážitek.',
    emoji: '🍅',
    cuisine: 'italian',
    difficulty: 'easy',
    recommendedCultivars: ['coratina'],
    recommendedRegions: ['apulie'],
    briefAngle: 'Důraz na kvalitu surovin (heirloom rajčata, buffalo mozzarella) a charakteristický italský EVOO s pikantnost. Coratina je ideální díky pepř-bylinkové notě.',
    unsplashQuery: 'caprese salad mozzarella tomato basil italian',
  },
  {
    slug: 'aglio-e-olio',
    title: 'Špagety aglio e olio',
    excerpt: 'Pět ingrediencí, deset minut, nekonečná elegance. Olivový olej tady není přísada — je hlavní hrdina.',
    emoji: '🍝',
    cuisine: 'italian',
    difficulty: 'easy',
    recommendedCultivars: ['coratina', 'frantoio'],
    recommendedRegions: ['apulie'],
    briefAngle: 'Klasika římské/neapolské kuchyně. Olivový olej se ohřívá s česnekem (ne přepálit!) a tvoří emulzi s pasta water. Bez parmezánu (původní recept).',
    unsplashQuery: 'spaghetti aglio olio garlic chili pasta italian',
  },
  {
    slug: 'hummus-s-extra-panenskym-olejem',
    title: 'Hummus s extra panenským olejem',
    excerpt: 'Domácí hummus z cizrny + tahini + EVOO. Zalije se olejem, posype paprikou — je to obraz, ne mísa.',
    emoji: '🫘',
    cuisine: 'mediterranean',
    difficulty: 'easy',
    recommendedCultivars: ['koroneiki'],
    recommendedRegions: ['peloponnes', 'kreta'],
    briefAngle: 'Levantská klasika, ale role oleje je zásadní — drizzlovaná část navrch je co dělá hummus z fast food premium pokrm. Řecký Koroneiki s nižší pikantností sedí lépe než italský Coratina.',
    unsplashQuery: 'hummus chickpea tahini olive oil paprika',
  },
  {
    slug: 'greek-salad-horiatiki',
    title: 'Greek salad — autentická horiatiki',
    excerpt: 'V Řecku se nikdy nedělá s ledovým salátem. Tady je autentická horiatiki — feta v plátech, žádné saláty, jen olivový olej a oregano.',
    emoji: '🥗',
    cuisine: 'greek',
    difficulty: 'easy',
    recommendedCultivars: ['koroneiki', 'kalamata'],
    recommendedRegions: ['kreta', 'peloponnes'],
    briefAngle: 'Demystifikace: žádný salát, žádný dressing. Jen rajčata, okurka, paprika, cibule, olivy, feta v jednom bloku, olivový olej, oregano. Důraz na čerstvost surovin.',
    unsplashQuery: 'greek salad feta olives tomato traditional',
  },
  {
    slug: 'tapenade',
    title: 'Olivová tapenade',
    excerpt: 'Tradiční provensálská pasta z oliv, kapar a anchovies. Skvělá na pečivo, jako základ omáčky nebo dipping pro zeleninu.',
    emoji: '🫒',
    cuisine: 'french',
    difficulty: 'easy',
    recommendedCultivars: ['kalamata'],
    recommendedRegions: ['peloponnes', 'kreta'],
    briefAngle: 'Provensálská klasika. Důraz na kvalitní olivy (Kalamata nebo Niçoise) a olivový olej s vyšší ovocností — Greek Kalamata cultivar pasuje. Zachovává se 7-10 dní v lednici.',
    unsplashQuery: 'tapenade black olive paste capers french provence',
  },
  {
    slug: 'focaccia-domaci',
    title: 'Focaccia s rozmarýnem a olivovým olejem',
    excerpt: 'Italské pečivo, kde olivový olej není v těstě jen pro chuť — drží mu strukturu i vlhkost. 6 hodin práce, 5 minut aktivního.',
    emoji: '🍞',
    cuisine: 'italian',
    difficulty: 'medium',
    recommendedCultivars: ['frantoio', 'leccino'],
    recommendedRegions: ['apulie'],
    briefAngle: 'Toskánsko-ligurský klasik. Olej se používá v těstě (hydratace + chuť) i navrchu (zlatá kůrka). Rozmarýn + sůl = Italian sandwich element.',
    unsplashQuery: 'focaccia bread rosemary olive oil italian baked',
  },
  {
    slug: 'carpaccio-z-hovezi-svickove',
    title: 'Carpaccio z hovězí svíčkové',
    excerpt: 'Tenké plátky syrového masa, parmazán, rukola, olivový olej. Originál Harry\'s Bar Venice, 1950 — a olej je tam důvod.',
    emoji: '🥩',
    cuisine: 'italian',
    difficulty: 'medium',
    recommendedCultivars: ['frantoio'],
    recommendedRegions: ['apulie'],
    briefAngle: 'Originální recept Giuseppe Cipriani. Kvalitní syrová svíčková, citron, kapary, parmazán, olej. Pikantnost a hořkost EVOO čistí jazyk po tučném mase. Frantoio sedí ideálně.',
    unsplashQuery: 'beef carpaccio raw thin sliced parmesan italian',
  },
  {
    slug: 'bagna-cauda-piemonteska',
    title: 'Bagna cauda — piemontský dip',
    excerpt: 'Italian fondue, ale s olejem místo sýru. Anchovies, česnek, olivový olej se ohřejou — dipping pro zimní zeleninu.',
    emoji: '🍲',
    cuisine: 'italian',
    difficulty: 'medium',
    recommendedCultivars: ['frantoio', 'leccino'],
    recommendedRegions: ['apulie'],
    briefAngle: 'Piemontese tradition (zimní pokrm rolníků). Olej se zahřeje s anchovies + česnek — vznikne emulze, kterou se dippuje raw zelenina (kardóny, paprika, fenykl). Klid neexistuje horký tuk.',
    unsplashQuery: 'bagna cauda dip anchovy garlic vegetables piedmont',
  },
  {
    slug: 'olivovy-olej-cake-citronovy',
    title: 'Citronový olivový olej cake',
    excerpt: 'Italský dezert kde olivový olej nahrazuje máslo. Vlhký, jemně ovocný, drží 4 dny — což pochybný cake nikdy.',
    emoji: '🍰',
    cuisine: 'italian',
    difficulty: 'easy',
    recommendedCultivars: ['manaki'],
    recommendedRegions: ['peloponnes'],
    briefAngle: 'Italian dolce, ale s olejem (mírnější profil = Manaki, ne Coratina!). Citronová kůra, olivový olej, vajíčka, mouka. Bez másla. Olej dává jiný typ vlhkosti — vydrží déle, lepší struktura.',
    unsplashQuery: 'olive oil lemon cake italian dessert mediterranean',
  },
  {
    slug: 'pita-s-olivovym-olejem',
    title: 'Domácí pita placky s olivovým olejem',
    excerpt: 'Řecké/levantské pita — kapsy, do kterých se vloží gyros nebo hummus. Domácí jsou za 2 hodiny a chutí dvakrát lepší než kupované.',
    emoji: '🥙',
    cuisine: 'greek',
    difficulty: 'medium',
    recommendedCultivars: ['koroneiki'],
    recommendedRegions: ['peloponnes', 'kreta'],
    briefAngle: 'Mediterranean staple. Olej do těsta + na pánev. Kapsy vznikají díky vysoké teplotě (oven nebo cast iron pánev). Greek Koroneiki passuje, italské oleje moc pikantní.',
    unsplashQuery: 'pita bread homemade flat greek mediterranean',
  },
]

const SYSTEM_PROMPT = `Jsi šéfkuchař + food writer pro Olivator.cz, srovnávač olivových olejů.
Píšeš recepty pro /recept sekci.

══ STYLISTIKA ══
- Aktivní hlas, přítomný čas, přirozená čeština
- Tón: praktický, konkrétní, ne marketingový
- Krátké instrukce — kuchař to musí číst během vaření
- ŽÁDNÉ fráze typu "skvělý", "lahodný", "nádherný"

══ STRUKTURA OUTPUTU ══
Vrať POUZE validní JSON ve formátu:
{
  "ingredients": [
    {"name": "...", "amount": 4, "unit": "ks", "note": "optional"},
    {"name": "olivový olej (extra panenský)", "amount": 50, "unit": "ml"}
  ],
  "instructions": [
    {"step": "Plný text instrukce, 1-3 věty."},
    {"step": "..."}
  ],
  "body_markdown": "Markdown text před recipe samotným — proč ten recept, kontextu, tipy, history. 400-700 slov. ## H2 sections. Žádný titulek (## nadpis) — ten je v DB.",
  "prep_time_min": 15,
  "cook_time_min": 5,
  "servings": 4,
  "recommended_oil_types": ["evoo"]
}

══ INGREDIENTS ══
- Vždy uveď olivový olej jako jednu z ingredencí, s konkrétním množstvím
- amount: number nebo null (pro "podle chuti")
- unit: "g", "ml", "ks", "lžíce", "lžička", "hrst", "podle chuti"
- note: optional doplnění (např. "extra panenský", "čerstvá")

══ INSTRUCTIONS ══
- 5-10 kroků
- Každý krok = jedna logická akce
- Konkrétní časy a teploty kde dává smysl

══ BODY MARKDOWN ══
- 400-700 slov
- Začni hookem (paradox, konkrétní fakt)
- ## H2 sekce: typicky "Proč tento recept", "Volba oleje", "Tipy a varianty"
- Spomeň, který typ oleje se hodí (cultivar, region) a proč
- Cross-link kde dává smysl: [text](/odruda/coratina), [text](/srovnavac)
- Konec: praktický takeaway

══ ČESKÁ KUCHYŇSKÁ TERMINOLOGIE ══
- "polévkové lžíce" → "lžíce"
- "čajová lžička" → "lžička"
- Celsia: 180°C ne 180 stupňů Celsia`

async function generateRecipeContent(brief: RecipeBrief): Promise<{
  ingredients: Array<{ name: string; amount: number | null; unit: string; note?: string }>
  instructions: Array<{ step: string }>
  body_markdown: string
  prep_time_min: number
  cook_time_min: number
  servings: number
  recommended_oil_types: string[]
}> {
  const userPrompt = `Recept: "${brief.title}"

Kategorie kuchyně: ${brief.cuisine}
Obtížnost: ${brief.difficulty}
Excerpt: ${brief.excerpt}

Doporučené cultivary olivového oleje: ${brief.recommendedCultivars.join(', ')}
Doporučené regiony: ${brief.recommendedRegions.join(', ')}

Klíčový angle (co je důležité): ${brief.briefAngle}

Vrať JSON podle template v system promptu.`

  const res = await callClaude({
    model: 'claude-sonnet-4-5',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })
  let raw = extractText(res).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  // Robustnost — Claude občas vrátí JSON s newlines uvnitř stringů (markdown
  // body), což strict JSON.parse nesnese. Použijeme JSON5-like cleanup:
  // - Multi-line strings → \n escape
  // - Trailing commas → odstraň
  try {
    return JSON.parse(raw)
  } catch (e) {
    // Try to extract body_markdown separately + parse the rest
    const bodyMatch = raw.match(/"body_markdown"\s*:\s*"([\s\S]*?)"\s*,\s*"prep_time/)
    if (bodyMatch) {
      const bodyEscaped = bodyMatch[1].replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')
      const fixed = raw.replace(bodyMatch[0], `"body_markdown": "${bodyEscaped}", "prep_time`)
      try {
        return JSON.parse(fixed)
      } catch {
        // Last resort — strip body_markdown completely, get partial parse
        const stripped = raw.replace(/"body_markdown"\s*:\s*"[\s\S]*?"\s*,/, '"body_markdown": "",')
        const partial = JSON.parse(stripped)
        partial.body_markdown = bodyMatch[1]  // Replace cleanly
        return partial
      }
    }
    throw e
  }
}

async function generateMeta(brief: RecipeBrief, body: string): Promise<{ title: string; description: string }> {
  const res = await callClaude({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: 'Jsi SEO copywriter. Vrať POUZE JSON {"title":"...","description":"..."}. Žádný komentář.',
    messages: [{
      role: 'user',
      content: `Pro recept "${brief.title}" vygeneruj:
- "title": 50-60 znaků (NIKDY nepřidávej " | Olivátor")
- "description": 130-160 znaků s recipe + olivový olej angle, CTA "vyzkoušej"

Excerpt: ${brief.excerpt}
Body preview: ${body.slice(0, 300)}`
    }],
  })
  const raw = extractText(res).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  return JSON.parse(raw)
}

async function fetchHero(brief: RecipeBrief): Promise<{ url: string; alt: string } | null> {
  try {
    const photos = await searchUnsplash(brief.unsplashQuery, 1)
    const p = photos[0]
    if (!p) return null
    return { url: p.url, alt: p.altText || brief.title }
  } catch {
    return null
  }
}

async function processOne(brief: RecipeBrief): Promise<{ ok: boolean; reason?: string }> {
  if (SKIP_EXISTING) {
    const { data: existing } = await supabaseAdmin
      .from('recipes')
      .select('id, body_markdown')
      .eq('slug', brief.slug)
      .maybeSingle()
    if (existing && (existing as { body_markdown: string | null }).body_markdown) {
      return { ok: false, reason: 'already exists with body' }
    }
  }

  const content = await generateRecipeContent(brief)
  if (!content.body_markdown || content.body_markdown.length < 300) {
    return { ok: false, reason: `body too short` }
  }
  if (!content.ingredients || content.ingredients.length < 3) {
    return { ok: false, reason: 'ingredients missing' }
  }
  if (!content.instructions || content.instructions.length < 3) {
    return { ok: false, reason: 'instructions missing' }
  }

  const meta = await generateMeta(brief, content.body_markdown)
  const hero = await fetchHero(brief)

  // Hard truncate meta — DB má VARCHAR(70/160) limity. Claude občas
  // překročí přes přílis bohatý popis.
  const metaTitle = meta.title.length > 70 ? meta.title.slice(0, 67) + '…' : meta.title
  const metaDesc = meta.description.length > 160 ? meta.description.slice(0, 157) + '…' : meta.description

  // Ochrana manual fotek: pokud recept už má vlastní upload, hero_image_url nepřepíšeme.
  const { data: existingRecipe } = await supabaseAdmin
    .from('recipes')
    .select('id')
    .eq('slug', brief.slug)
    .maybeSingle()
  let protectedHeroUrl: string | null | undefined = hero?.url ?? null
  if (existingRecipe?.id) {
    const { data: manualPhoto } = await supabaseAdmin
      .from('entity_images')
      .select('id')
      .eq('entity_id', existingRecipe.id as string)
      .eq('entity_type', 'recipe')
      .in('source', ['manual_upload', 'manual'])
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    if (manualPhoto) protectedHeroUrl = undefined // vynechat z upsert — manual foto nesmí přepsat
  }

  const upsertPayload: Record<string, unknown> = {
    slug: brief.slug,
    title: brief.title,
    excerpt: brief.excerpt,
    emoji: brief.emoji,
    read_time: `${content.prep_time_min + content.cook_time_min} min`,
    prep_time_min: content.prep_time_min,
    cook_time_min: content.cook_time_min,
    servings: content.servings,
    difficulty: brief.difficulty,
    cuisine: brief.cuisine,
    ingredients: content.ingredients,
    instructions: content.instructions,
    body_markdown: content.body_markdown,
    recommended_oil_types: content.recommended_oil_types,
    recommended_cultivars: brief.recommendedCultivars,
    recommended_regions: brief.recommendedRegions,
    meta_title: metaTitle,
    meta_description: metaDesc,
    status: 'draft',
    source: 'ai_generated',
  }
  if (protectedHeroUrl !== undefined) upsertPayload.hero_image_url = protectedHeroUrl

  const { error } = await supabaseAdmin.from('recipes').upsert(upsertPayload, { onConflict: 'slug' })

  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

async function main() {
  const briefs = TARGET_SLUG
    ? RECIPE_BRIEFS.filter(b => b.slug === TARGET_SLUG)
    : RECIPE_BRIEFS

  console.log(`✏️  generuju ${briefs.length} receptů${SKIP_EXISTING ? ' (skip-existing)' : ''}\n`)

  let ok = 0
  let failed = 0
  let skipped = 0

  for (const brief of briefs) {
    process.stdout.write(`  → ${brief.slug.padEnd(35)}`)
    try {
      const result = await processOne(brief)
      if (result.ok) {
        ok++
        console.log(' ✓')
      } else if (result.reason?.includes('already exists')) {
        skipped++
        console.log(` ⏭️  ${result.reason}`)
      } else {
        failed++
        console.log(` ❌ ${result.reason}`)
      }
    } catch (err) {
      failed++
      console.log(` ❌ ${err instanceof Error ? err.message.slice(0, 60) : 'unknown'}`)
    }
  }

  console.log(`\n📊 ${ok} ok / ${skipped} skipped / ${failed} failed`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
