/**
 * Opravuje hero_image_url u všech aktivních článků.
 * Každý článek dostane topic-specific Unsplash query (BUG-014 z CLAUDE.md).
 *
 * Run:
 *   env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/fix-article-hero-images.ts
 *   env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/fix-article-hero-images.ts --dry-run
 */
import { supabaseAdmin } from '@/lib/supabase'
import { searchUnsplash } from '@/lib/unsplash'

const DRY = process.argv.includes('--dry-run')

// topic-specific query per slug (BUG-014: nikdy generický "olive oil")
const QUERIES: Record<string, string> = {
  'jak-cist-etiketu-olivoveho-oleje':        'olive oil bottle label closeup ingredients',
  'polyfenoly-kolik-je-dost':                'olive oil pouring health antioxidants polyphenols',
  'extra-panensky-vs-panensky-vs-rafinovany': 'olive oil bottles different qualities row',
  'olivovy-olej-na-smazeni-bod-zakoureni':   'pan frying vegetables olive oil stovetop',
  'olivovy-olej-a-zdravi-veda-2026':         'mediterranean diet olive oil bread healthy nutrition',
  'dop-pgi-bio-certifikace':                 'olive oil bottle premium quality europe seal',
  'sklizen-oliv-early-vs-late-harvest':      'olive harvest picking tree autumn green olives',
  'filtrovany-vs-nefiltrovany-olivovy-olej': 'unfiltered olive oil bottle cloudy italian',
  'stredomorska-strava-olivovy-olej':        'mediterranean food table fish vegetables salad',
  'olivovy-olej-pro-deti':                   'healthy family food kitchen children cooking',
  'olivovy-olej-do-salatu-vs-na-vareni':     'olive oil salad fresh tomatoes drizzle',
  'premium-olivovy-olej-ma-smysl':           'luxury gourmet food bottle premium gift',
  'olivovy-olej-do-200-kc':                  'olive oil bottle shelf affordable grocery',
  'darkove-baleni-olivovy-olej':             'olive oil gift bottle box wrapped present',
  'jak-skladovat-olivovy-olej-doma':         'olive oil dark glass bottle pantry storage',
  'otevrena-lahev-jak-rychle-spotrebovat':   'olive oil bottle open kitchen counter pouring',
  'kde-koupit-olivovy-olej-cr':              'olive oil specialty delicatessen store shop',
  'falesny-olivovy-olej-jak-rozeznat':       'olive oil bottle authenticity quality inspection',
  'degustace-olivoveho-oleje-doma':          'olive oil tasting glass professional sensory',
  // legacy static articles
  'jak-vybrat-olivovy-olej':                 'olive oil bottles selection quality comparison',
  'nejlepsi-olivovy-olej-2026':              'olive oil best quality award winner bottle',
  'polyfenoly-proc-na-nich-zalezi':          'antioxidants food health laboratory compounds',
  'recky-vs-italsky':                        'olive oil mediterranean greece italy coast',
}

async function main() {
  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select('slug, title, hero_image_url, source')
    .eq('status', 'active')
    .order('slug')

  if (error || !articles) {
    console.error('DB chyba:', error?.message)
    process.exit(1)
  }

  console.log(`${DRY ? '🔍 DRY RUN — ' : '✏️  LIVE — '}opravuji hero images pro ${articles.length} článků\n`)

  let ok = 0
  let failed = 0
  let skipped = 0

  for (const article of articles) {
    const query = QUERIES[article.slug]

    if (!query) {
      console.log(`  ⚠️  ${article.slug.padEnd(50)} — ŽÁDNÉ QUERY, přeskakuji`)
      skipped++
      continue
    }

    process.stdout.write(`  → ${article.slug.padEnd(50)}`)

    try {
      const photos = await searchUnsplash(query, 5)

      // Vyber nejlepší foto (landscape preferuj, nejlépe první výsledek)
      const best = photos.find(p => p.width > p.height) ?? photos[0]

      if (!best) {
        console.log(`NO RESULTS (query: "${query}")`)
        failed++
        continue
      }

      const newUrl = best.url

      if (DRY) {
        console.log(`✓ WOULD SET → ${newUrl.slice(0, 60)}...`)
        console.log(`     query: "${query}" | ${best.attribution}`)
        ok++
        continue
      }

      const { error: upErr } = await supabaseAdmin
        .from('articles')
        .update({ hero_image_url: newUrl })
        .eq('slug', article.slug)

      if (upErr) {
        console.log(`❌ DB UPDATE FAILED: ${upErr.message}`)
        failed++
      } else {
        console.log(`✓ ${newUrl.slice(0, 55)}...`)
        ok++
      }

      // Unsplash rate limit: free tier = 50 req/hod → max 1 req/1.2s
      await new Promise(r => setTimeout(r, 1300))

    } catch (e) {
      console.log(`❌ ${(e as Error).message.slice(0, 80)}`)
      failed++
    }
  }

  console.log(`\n📊 ${ok} opraveno / ${skipped} přeskočeno / ${failed} selhalo`)
}

main().catch(console.error)
