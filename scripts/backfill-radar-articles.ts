/**
 * Backfill stávajících radar_items o full article + image + slug + meta.
 *
 * Pro každý item bez czech_article: stáhne originál, regeneruje přes Claude
 * Haiku, fetchne Unsplash hero, vygeneruje slug.
 *
 * Spuštění:
 *   npx tsx scripts/backfill-radar-articles.ts            # live
 *   npx tsx scripts/backfill-radar-articles.ts --dry-run  # preview
 */
import { supabaseAdmin } from '@/lib/supabase'
import { fetchArticleText } from '@/lib/article-fetcher'
import { searchUnsplash } from '@/lib/unsplash'
import { callClaude, extractText } from '@/lib/anthropic'
import { slugify } from '@/lib/utils'

const DRY_RUN = process.argv.includes('--dry-run')
const MODEL = 'claude-haiku-4-5-20251001'

interface Item {
  id: string
  source: string | null
  original_url: string | null
  original_title: string | null
  czech_title: string
  czech_summary: string | null
  czech_article: string | null
  cz_context: string | null
  badge: string | null
  slug: string | null
  image_url: string | null
}

const PROMPT = (title: string, summary: string, fullText: string | null) =>
  `Jsi redaktor Olivator.cz. Z této krátké zprávy o olivovém oleji napiš plnohodnotný\n` +
  `český článek pro čtenáře co neumí cizí jazyky.\n\n` +
  `Vrať POUZE validní JSON:\n` +
  `{\n` +
  `  "czech_article": "350-600 slov, 4-6 odstavců oddělených \\n\\n. Lead, kontext, čísla, dopad.",\n` +
  `  "meta_title": "SEO title max 60 znaků",\n` +
  `  "meta_description": "SEO description 140-160 znaků",\n` +
  `  "unsplash_query": "topic-specific anglicky 3-5 slov pro hero foto"\n` +
  `}\n\n` +
  `Titulek: ${title}\n` +
  `Krátké shrnutí: ${summary}\n\n` +
  (fullText ? `Plný text z originálu:\n${fullText}` : '(Plný text se nepodařilo stáhnout — vycházej ze shrnutí.)')

async function generateContent(item: Item, fullText: string | null) {
  const resp = await callClaude({
    model: MODEL,
    max_tokens: 2500,
    system: 'Jsi redaktor olivator.cz. Píšeš česky, novinářsky. Jen validní JSON.',
    messages: [{ role: 'user', content: PROMPT(item.czech_title, item.czech_summary ?? '', fullText) }],
  })
  const raw = extractText(resp).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  return JSON.parse(raw) as {
    czech_article?: string
    meta_title?: string
    meta_description?: string
    unsplash_query?: string
  }
}

async function uniqueSlug(title: string, currentId: string): Promise<string> {
  const base = slugify(title).slice(0, 80) || 'novinka'
  let candidate = base
  let n = 2
  while (n < 50) {
    const { data } = await supabaseAdmin
      .from('radar_items')
      .select('id')
      .eq('slug', candidate)
      .limit(1)
    const conflict = (data ?? []).find(r => r.id !== currentId)
    if (!conflict) return candidate
    candidate = `${base}-${n}`
    n++
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`
}

async function main() {
  console.log(DRY_RUN ? '🧪 DRY RUN' : '✏️  LIVE')

  const { data, error } = await supabaseAdmin
    .from('radar_items')
    .select('id, source, original_url, original_title, czech_title, czech_summary, czech_article, cz_context, badge, slug, image_url')
    .order('published_at', { ascending: false })
    .limit(100)

  if (error || !data) {
    console.error('Query failed:', error)
    process.exit(1)
  }

  const todo = (data as Item[]).filter(it => !it.czech_article || !it.image_url || !it.slug)
  console.log(`\n${todo.length} z ${data.length} potřebuje backfill\n`)

  let ok = 0
  let failed = 0

  for (const item of todo) {
    process.stdout.write(`  ${item.czech_title.slice(0, 55).padEnd(55)} → `)
    try {
      const fullText = item.original_url ? await fetchArticleText(item.original_url) : null

      const patch: Record<string, string | null> = {}
      let unsplashQuery: string | null = null

      if (!item.czech_article || !item.slug) {
        const gen = await generateContent(item, fullText)
        if (gen.czech_article) patch.czech_article = gen.czech_article
        if (gen.meta_title) patch.meta_title = gen.meta_title.slice(0, 70)
        if (gen.meta_description) patch.meta_description = gen.meta_description.slice(0, 200)
        unsplashQuery = gen.unsplash_query ?? null
      }

      if (!item.slug) {
        patch.slug = await uniqueSlug(item.czech_title, item.id)
      }

      // Image fetch — pokud chybí, použij Claude query nebo fallback z badge
      if (!item.image_url) {
        const query = unsplashQuery ?? `olive oil ${item.badge ?? 'mediterranean'}`
        try {
          const photos = await searchUnsplash(query, 1)
          const p = photos[0]
          if (p) {
            patch.image_url = p.url
            patch.image_alt = p.altText || item.czech_title
            patch.image_attribution = p.attribution
            patch.image_source_url = p.sourceUrl
          }
        } catch (err) {
          console.log(`unsplash err: ${err instanceof Error ? err.message.slice(0, 50) : 'unknown'}`)
        }
      }

      if (Object.keys(patch).length === 0) {
        console.log('nothing to patch')
        continue
      }

      if (!DRY_RUN) {
        const { error: updateErr } = await supabaseAdmin
          .from('radar_items')
          .update(patch)
          .eq('id', item.id)
        if (updateErr) throw updateErr
      }

      console.log(`✅ ${Object.keys(patch).join(', ')}`)
      ok++
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message.slice(0, 60) : 'unknown'}`)
      failed++
    }
  }

  console.log(`\nHotovo. ${ok} ok / ${failed} failed`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
