// AI recipe generator — vytvoří strukturovaný recept z entity (region/cultivar/brand)
// kontextu. Output je JSON s ingredients + instructions + body markdown.
//
// Použití: admin klikne "Navrhni recept k Apulii" → tato funkce → save do DB
// jako draft → admin upraví → publish.

import { callClaude, extractText } from './anthropic'
import type { RecipeIngredient, RecipeInstruction } from './recipes-db'

export interface RecipeContext {
  // Buď region NEBO cultivar NEBO brand (alespoň 1)
  regionName?: string
  regionSlug?: string
  cultivarName?: string
  cultivarSlug?: string
  brandName?: string
  brandSlug?: string

  // Volitelný hint co za jídlo chceme
  cuisineHint?: string  // "italian" | "greek" | …
  dishHint?: string     // "salát", "hlavní chod", "dezert"
}

export interface GeneratedRecipe {
  title: string
  excerpt: string
  emoji: string
  cuisine: string
  difficulty: 'easy' | 'medium' | 'hard'
  prepTimeMin: number
  cookTimeMin: number
  servings: number
  ingredients: RecipeIngredient[]
  instructions: RecipeInstruction[]
  bodyMarkdown: string
  metaTitle: string
  metaDescription: string
  recommendedRegions: string[]
  recommendedCultivars: string[]
}

const SYSTEM = `Jsi šéf-redaktor receptové sekce Olivator.cz. Píšeš recepty kde olivový olej hraje hlavní roli.

PRAVIDLA:
- Český jazyk, aktivní hlas, přítomný čas
- Faktický tón — chytrý kamarád sommelier, ne salesy
- Nepoužívej: "prémiový", "vyhlášený", "dokonalý", "ideální volba"
- Konkrétní čísla, množství, kroky
- Olej je vždy klíčová ingredience — vysvětli proč zrovna tento typ
- Recept musí být SKUTEČNĚ realizovatelný v české kuchyni (suroviny dostupné v ČR)

Output je VŽDY čisté JSON, žádný markdown wrapper.`

const SCHEMA_HINT = `{
  "title": "string (název receptu, lidsky čitelný)",
  "excerpt": "string (max 180 znaků, perex pod nadpisem)",
  "emoji": "string (1 emoji co recept reprezentuje, např. 🍅 🌿 🐟)",
  "cuisine": "italian | greek | spanish | czech | french | mediterranean",
  "difficulty": "easy | medium | hard",
  "prepTimeMin": number,
  "cookTimeMin": number (0 pokud raw),
  "servings": number,
  "ingredients": [
    {"name": "surovina", "amount": number_or_null, "unit": "ks/g/lžíce/...", "note": "optional"}
  ],
  "instructions": [
    {"step": "Co udělat v tomto kroku.", "duration_min": optional_number, "note": "optional"}
  ],
  "bodyMarkdown": "string s ## H2 nadpisy — tipy, kontext k oleji, doporučení, variace",
  "metaTitle": "max 65 znaků",
  "metaDescription": "max 155 znaků",
  "recommendedRegions": ["slug1", "slug2"],
  "recommendedCultivars": ["slug1", "slug2"]
}`

export async function generateRecipe(ctx: RecipeContext): Promise<GeneratedRecipe> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY missing')
  }

  // Build context block
  const ctxLines: string[] = []
  if (ctx.regionName) ctxLines.push(`- Region: ${ctx.regionName} (slug: ${ctx.regionSlug ?? '?'})`)
  if (ctx.cultivarName) ctxLines.push(`- Odrůda: ${ctx.cultivarName} (slug: ${ctx.cultivarSlug ?? '?'})`)
  if (ctx.brandName) ctxLines.push(`- Značka kontextu: ${ctx.brandName}`)
  if (ctx.cuisineHint) ctxLines.push(`- Hint kuchyně: ${ctx.cuisineHint}`)
  if (ctx.dishHint) ctxLines.push(`- Hint typu jídla: ${ctx.dishHint}`)

  if (ctxLines.length === 0) {
    throw new Error('Recipe context vyžaduje alespoň region/cultivar/brand')
  }

  const prompt = `Navrhni recept který se hodí k tomuto kontextu:

${ctxLines.join('\n')}

Recept MUSÍ:
- Mít olivový olej jako klíčovou ingredienci (ne marginální)
- Být realizovatelný v české kuchyni (dostupné suroviny)
- Mít 5-10 surovin (ne víc, ne komplikované)
- Mít 4-8 kroků (jasné a stručné)
- Mít bodyMarkdown 200-400 slov s tipy a kontextem k oleji
- recommendedRegions / recommendedCultivars: ten daný entity slug + případně další 1-2 co se hodí

Pokud je kontext řecká odrůda Koroneiki, navrhni něco řeckého. Pokud Coratina z Apulie, něco italského. Atd.

Output VÝHRADNĚ jako čisté JSON podle schématu:
${SCHEMA_HINT}`

  const response = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = extractText(response).trim()
  // Strip markdown code blocks if Claude wrapped output
  const json = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: GeneratedRecipe
  try {
    parsed = JSON.parse(json) as GeneratedRecipe
  } catch (err) {
    throw new Error(`Recipe JSON parse failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Sanitize defaults
  return {
    title: parsed.title || 'Nový recept',
    excerpt: (parsed.excerpt ?? '').slice(0, 180),
    emoji: parsed.emoji || '🍽',
    cuisine: parsed.cuisine || 'mediterranean',
    difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty as string)
      ? parsed.difficulty
      : 'medium',
    prepTimeMin: Number(parsed.prepTimeMin) || 15,
    cookTimeMin: Number(parsed.cookTimeMin) || 0,
    servings: Number(parsed.servings) || 4,
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
    bodyMarkdown: parsed.bodyMarkdown ?? '',
    metaTitle: (parsed.metaTitle ?? '').slice(0, 70),
    metaDescription: (parsed.metaDescription ?? '').slice(0, 160),
    recommendedRegions: Array.isArray(parsed.recommendedRegions)
      ? parsed.recommendedRegions
      : [],
    recommendedCultivars: Array.isArray(parsed.recommendedCultivars)
      ? parsed.recommendedCultivars
      : [],
  }
}
