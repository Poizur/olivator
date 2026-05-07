/**
 * Doplní hero_image_url pro články + recepty bez obrázku.
 * Topic-specific Unsplash queries per slug (BUG-014 z CLAUDE.md prevence).
 *
 * Run: unset ANTHROPIC_API_KEY UNSPLASH_ACCESS_KEY
 *      npx tsx --env-file=.env.local scripts/backfill-content-images.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { searchUnsplash } from '@/lib/unsplash'

// Topic-specific queries per article slug — vyhneme se generickému "olive oil"
// které vrací stejnou fotku pro všechny.
const ARTICLE_QUERIES: Record<string, string[]> = {
  'degustace-olivoveho-oleje-doma': ['olive oil tasting glass professional', 'olive oil sommelier glass'],
  'dop-pgi-bio-certifikace': ['olive oil certification quality bottle europe', 'olive oil label certified'],
  'jak-vybrat-olivovy-olej': ['olive oil bottles supermarket selection', 'olive oil store choosing'],
  'nejlepsi-olivovy-olej-2026': ['premium olive oil bottle gold', 'extra virgin olive oil top'],
  'olivovy-olej-do-200-kc': ['olive oil supermarket bottle budget', 'olive oil shelf store'],
  'olivovy-olej-na-smazeni-bod-zakoureni': ['olive oil cooking pan kitchen', 'olive oil frying pan'],
  'polyfenoly-proc-na-nich-zalezi': ['olive oil pouring antioxidants', 'olive oil drizzle health'],
  'premium-olivovy-olej-ma-smysl': ['premium olive oil bottle luxury', 'olive oil gourmet gold'],
  'recky-vs-italsky': ['greek italian olive oil mediterranean', 'olive trees mediterranean countryside'],
}

const RECIPE_QUERIES: Record<string, string[]> = {
  'bagna-cauda-piemonteska': ['bagna cauda dip anchovy', 'italian dip vegetables piedmont'],
  'bruschetta-s-rajcaty': ['bruschetta tomato basil italian', 'tomato basil bread italian'],
  'domaci-pesto': ['pesto basil pine nuts italian', 'fresh basil pesto sauce'],
  'italsky-salat-s-burratou-a-pecenou-paprikou': ['burrata salad italian', 'burrata cheese roasted peppers'],
  'tapenade': ['tapenade olive paste', 'black olive spread provence'],
}

async function tryFetchPhoto(slug: string, queries: string[]): Promise<string | null> {
  for (const q of queries) {
    try {
      const photos = await searchUnsplash(q, 1)
      if (photos[0]?.url) {
        console.log(`  ✓ ${slug.slice(0, 45).padEnd(45)} via "${q}"`)
        return photos[0].url
      }
    } catch (err) {
      console.warn(`  ⚠ ${slug}: ${err instanceof Error ? err.message.slice(0, 40) : 'unknown'}`)
    }
  }
  console.warn(`  ✗ ${slug}: all queries returned 0 photos`)
  return null
}

async function main() {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.error('❌ UNSPLASH_ACCESS_KEY missing')
    process.exit(1)
  }

  // ── Articles ──────────────────────────────────────────────────────────────
  console.log('\n═══ Články ═══')
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug')
    .is('hero_image_url', null)
    .eq('status', 'active')

  for (const a of (articles ?? []) as Array<{ slug: string }>) {
    const queries = ARTICLE_QUERIES[a.slug] ?? [`${a.slug.replace(/-/g, ' ')} olive oil`]
    const url = await tryFetchPhoto(a.slug, queries)
    if (url) {
      await supabaseAdmin.from('articles').update({ hero_image_url: url }).eq('slug', a.slug)
    }
  }

  // ── Recipes ───────────────────────────────────────────────────────────────
  console.log('\n═══ Recepty ═══')
  const { data: recipes } = await supabaseAdmin
    .from('recipes')
    .select('slug')
    .is('hero_image_url', null)
    .eq('status', 'active')

  for (const r of (recipes ?? []) as Array<{ slug: string }>) {
    const queries = RECIPE_QUERIES[r.slug] ?? [`${r.slug.replace(/-/g, ' ')} food`]
    const url = await tryFetchPhoto(r.slug, queries)
    if (url) {
      await supabaseAdmin.from('recipes').update({ hero_image_url: url }).eq('slug', r.slug)
    }
  }

  // ── Final stats ────────────────────────────────────────────────────────────
  const arts = await supabaseAdmin.from('articles').select('hero_image_url').eq('status', 'active')
  const recs = await supabaseAdmin.from('recipes').select('hero_image_url').eq('status', 'active')
  const aTotal = (arts.data ?? []).length
  const aOk = (arts.data ?? []).filter((r: { hero_image_url: string | null }) => r.hero_image_url).length
  const rTotal = (recs.data ?? []).length
  const rOk = (recs.data ?? []).filter((r: { hero_image_url: string | null }) => r.hero_image_url).length
  console.log('\n═══ Result ═══')
  console.log(`Články: ${aOk}/${aTotal} s obrázkem`)
  console.log(`Recepty: ${rOk}/${rTotal} s obrázkem`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
