/**
 * Audit + fix broken Unsplash inline images in articles.body_markdown + hero_image_url.
 *
 * Broken format: photo-{shortID} where shortID has no hyphens and length < 15
 *   e.g. photo-LF5p7GkQkxk  → 404 in browser
 * Good format:  photo-1619728750848-dc71cd7471ae  → hash-based, works
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/fix-broken-unsplash-inline.ts
 *   npx tsx --env-file=.env.local scripts/fix-broken-unsplash-inline.ts --dry-run
 */

import { supabaseAdmin } from '@/lib/supabase'
import { searchUnsplash } from '@/lib/unsplash'

const DRY_RUN = process.argv.includes('--dry-run')

// Unsplash free tier: 50 req/hour. With 57 broken URLs we need ~57 calls.
// 1.5s delay keeps us at ~40 req/min = safe.
const UNSPLASH_DELAY_MS = 1500

// Topic-specific hero queries per slug — REQUIRED per CLAUDE.md BUG-vzor 6:
// generic queries return the same photo for every article.
const HERO_QUERIES: Record<string, string> = {
  'rafinovany-olivovy-olej': 'olive oil refinery industrial processing bottles',
  'polyfenoly-proc-na-nich-zalezi': 'olive oil pouring antioxidants health polyphenols',
  'recky-vs-italsky': 'greek italian olive oil mediterranean comparison',
  'jak-vybrat-olivovy-olej': 'olive oil bottles supermarket selection choosing',
  'recky-italsky-spanelsky-olej': 'greek italian spanish olive oil mediterranean bottles',
  'premium-olivovy-olej-ma-smysl': 'premium olive oil bottle luxury gourmet',
  'olivovy-olej-z-pokrutin': 'olive pomace oil industrial extraction',
  'olivovy-olej-na-smazeni-bod-zakoureni': 'olive oil cooking pan frying kitchen',
  'jak-skladovat-olivovy-olej-doma': 'olive oil storage dark bottle shelf kitchen',
  'domaci-olivovy-olej': 'olive grove mediterranean homemade harvest',
  'je-olivovy-olej-zdravy': 'olive oil health benefits mediterranean diet',
  'olivovy-olej-vs-slunecnicovy': 'olive oil sunflower oil comparison bottles',
  'jak-cist-etiketu-olivoveho-oleje': 'olive oil label reading certification quality',
  'olivovy-olej-s-citronem-po-rano': 'lemon olive oil morning ritual glass',
  'olivovy-olej-do-salatu-vs-na-vareni': 'olive oil salad cooking kitchen use',
  'olivovy-olej-pro-deti': 'olive oil family kitchen children healthy food',
  'stredomorska-strava-olivovy-olej': 'mediterranean diet food table olive oil vegetables',
  'extra-panensky-vs-panensky-vs-rafinovany': 'olive oil grades comparison extra virgin bottles',
  'polyfenoly-kolik-je-dost': 'olive oil polyphenols antioxidants health dark bottle',
  'filtrovany-vs-nefiltrovany-olivovy-olej': 'filtered unfiltered olive oil turbid clear bottle',
  'olivovy-olej-a-zdravi-veda-2026': 'olive oil science research health study',
  'sklizen-oliv-early-vs-late-harvest': 'olive harvest green olives trees picking',
  'otevrena-lahev-jak-rychle-spotrebovat': 'open olive oil bottle kitchen shelf freshness',
  'falesny-olivovy-olej-jak-rozeznat': 'olive oil fraud fake bottle label suspicious',
  'nejlepsi-olivovy-olej-na-svete': 'premium olive oil award winning bottle gold',
  'dop-pgi-bio-certifikace': 'olive oil certification quality label europe',
  'olivovy-olej-na-plet-a-vlasy': 'olive oil skin care beauty cosmetic natural',
  'kde-koupit-olivovy-olej-cr': 'olive oil supermarket store shelf buying',
  'darkove-baleni-olivovy-olej': 'olive oil gift set packaging elegant bottle',
  'degustace-olivoveho-oleje-doma': 'olive oil tasting glass professional sommelier',
  'nejlepsi-olivovy-olej-2026': 'premium olive oil bottle top rated award',
  'olivovy-olej-do-200-kc': 'olive oil supermarket bottle budget affordable',
  'olivovy-olej-ve-spreji': 'olive oil spray bottle cooking kitchen',
  'kalamata-pdo-olivovy-olej': 'kalamata greece olive oil dark bottles mediterranean',
}

// Inline image queries: fallback table for slugs where alt text is too long/unsuitable
const INLINE_QUERIES: Record<string, string[]> = {
  'rafinovany-olivovy-olej': [
    'olive oil refinery industrial',
    'olive oil cooking pan high heat',
  ],
  'polyfenoly-proc-na-nich-zalezi': [
    'olive trees green olives close up',
    'olive press mill stone traditional',
    'olive oil pouring gold liquid',
  ],
  'olivovy-olej-z-pokrutin': [
    'olive trees harvest fruit',
    'industrial food processing machinery',
    'french fries frying oil',
  ],
  'je-olivovy-olej-zdravy': [
    'mediterranean food table healthy',
    'grandmother grandchild cooking family',
    'green olives branch harvest',
    'olive oil salad dressing drizzle',
    'olive oil supermarket shelf',
    'olive oil spoon daily dose',
  ],
  'olivovy-olej-vs-slunecnicovy': [
    'olive oil sunflower bottles side by side',
    'green salad vegetables olive oil dressing',
  ],
  'nejlepsi-olivovy-olej-na-svete': [
    'olive mill pressing harvest olives',
    'olive grove spain plantation aerial',
  ],
  'olivovy-olej-ve-spreji': [
    'olive oil spray bottle cooking pan',
  ],
  'kalamata-pdo-olivovy-olej': [
    'olives dark purple close up branch',
    'greek hillside countryside olive trees',
  ],
}

// Bad format: no hyphens in ID, < 15 chars (e.g. LF5p7GkQkxk, or bare 1716643863806)
// Good format: contains hyphens (e.g. 1619728750848-dc71cd7471ae — two parts joined by hyphen)
// Regex must capture the FULL ID including hyphens so we don't truncate valid hash-based IDs.
const BROKEN_UNSPLASH_RE = /https:\/\/images\.unsplash\.com\/photo-([A-Za-z0-9][A-Za-z0-9-]*)(\?[^\s)"'\]]*)?/g

function isShortId(id: string): boolean {
  // Short/broken: no hyphens AND fewer than 15 chars
  // Long IDs without hyphens (e.g. 1716643863806 = 13 digits) are ALSO broken — they're the
  // first half of a hash-based ID that lost its suffix. Any ID that truly works has a hyphen.
  return !id.includes('-')
}

function extractBrokenUrls(text: string): Array<{ full: string; id: string }> {
  const results: Array<{ full: string; id: string }> = []
  let m: RegExpExecArray | null
  BROKEN_UNSPLASH_RE.lastIndex = 0
  while ((m = BROKEN_UNSPLASH_RE.exec(text)) !== null) {
    if (isShortId(m[1])) results.push({ full: m[0], id: m[1] })
  }
  return results
}

function extractAltForUrl(markdown: string, urlBase: string): string | null {
  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(markdown)) !== null) {
    if (m[2].startsWith(urlBase)) return m[1] || null
  }
  return null
}

function buildInlineQuery(alt: string | null, slug: string, index: number): string {
  // Prefer short alt text (< 60 chars) — long ones are captions, not good search terms
  if (alt && alt.length > 4 && alt.length <= 60) return alt

  const slugQueries = INLINE_QUERIES[slug]
  if (slugQueries?.[index]) return slugQueries[index]
  if (slugQueries?.[0]) return slugQueries[0]

  // Last resort: first 4 words of alt + "olive oil"
  if (alt && alt.length > 60) {
    const short = alt.split(/\s+/).slice(0, 4).join(' ')
    return `${short} olive oil`
  }
  return `${slug.replace(/-/g, ' ')} olive oil`
}

async function checkUrl(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    return res.status
  } catch { return 0 }
}

async function fetchWithRetry(query: string, retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const photos = await searchUnsplash(query, 3)
      return photos[0]?.url ?? null
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Rate Limit') && i < retries) {
        console.log(`    ⏳ Rate limit — čekám 70s…`)
        await new Promise(r => setTimeout(r, 70_000))
        continue
      }
      throw err
    }
  }
  return null
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.error('❌ UNSPLASH_ACCESS_KEY missing')
    process.exit(1)
  }

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Načítám articles z DB…\n`)

  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select('id, slug, body_markdown, hero_image_url')
    .not('body_markdown', 'is', null)

  if (error) { console.error('❌ DB error:', error.message); process.exit(1) }
  if (!articles?.length) { console.log('Žádné articles.'); return }

  console.log(`Celkem articles: ${articles.length}\n`)

  let totalBroken = 0, totalFixed = 0, totalFailed = 0

  for (const article of articles) {
    const body = article.body_markdown ?? ''
    const hero = article.hero_image_url ?? ''

    const candidates = extractBrokenUrls(body)
    const heroMatch = hero ? extractBrokenUrls(hero) : []
    if (candidates.length === 0 && heroMatch.length === 0) continue

    console.log(`📄 ${article.slug}  (inline: ${candidates.length}, hero: ${heroMatch.length})`)

    let newBody = body
    let newHero = hero

    // Process inline images
    let inlineIndex = 0
    for (const { full: brokenUrl, id } of candidates) {
      totalBroken++
      const status = await checkUrl(brokenUrl)
      console.log(`  ${status === 200 ? '✓' : '✗'} [${status}] inline  ${brokenUrl.slice(0, 75)}`)
      if (status === 200) { inlineIndex++; continue }

      const alt = extractAltForUrl(body, `https://images.unsplash.com/photo-${id}`)
      const query = buildInlineQuery(alt, article.slug, inlineIndex)

      await sleep(UNSPLASH_DELAY_MS)
      try {
        const newUrl = await fetchWithRetry(query)
        if (!newUrl) { console.log(`    ⚠  0 fotek pro "${query}"`); totalFailed++; inlineIndex++; continue }
        console.log(`    → ${newUrl.slice(0, 75)}`)
        console.log(`      query: "${query}"`)
        if (!DRY_RUN) newBody = newBody.split(brokenUrl).join(newUrl)
        totalFixed++
      } catch (err) {
        console.log(`    ✗  ${err instanceof Error ? err.message.slice(0, 80) : err}`)
        totalFailed++
      }
      inlineIndex++
    }

    // Process hero_image_url
    for (const { full: brokenUrl } of heroMatch) {
      totalBroken++
      const status = await checkUrl(brokenUrl)
      console.log(`  ${status === 200 ? '✓' : '✗'} [${status}] [hero]  ${brokenUrl.slice(0, 75)}`)
      if (status === 200) continue

      const query = HERO_QUERIES[article.slug] ?? `${article.slug.replace(/-/g, ' ')} olive oil`

      await sleep(UNSPLASH_DELAY_MS)
      try {
        const newUrl = await fetchWithRetry(query)
        if (!newUrl) { console.log(`    ⚠  0 fotek pro "${query}"`); totalFailed++; continue }
        console.log(`    → ${newUrl.slice(0, 75)}`)
        console.log(`      query: "${query}"`)
        if (!DRY_RUN) newHero = newHero.split(brokenUrl).join(newUrl)
        totalFixed++
      } catch (err) {
        console.log(`    ✗  ${err instanceof Error ? err.message.slice(0, 80) : err}`)
        totalFailed++
      }
    }

    // Persist
    if (!DRY_RUN && (newBody !== body || newHero !== hero)) {
      const updates: Record<string, string> = {}
      if (newBody !== body) updates.body_markdown = newBody
      if (newHero !== hero) updates.hero_image_url = newHero
      const { error: upErr } = await supabaseAdmin
        .from('articles')
        .update(updates)
        .eq('id', article.id)
      if (upErr) console.log(`  ❌ DB update: ${upErr.message}`)
      else console.log(`  ✅ uloženo`)
    }
    console.log()
  }

  console.log(`════ Výsledek ════`)
  console.log(`Broken URL nalezeno:  ${totalBroken}`)
  console.log(`Opraveno:             ${totalFixed}`)
  console.log(`Selhalo:              ${totalFailed}`)
  if (DRY_RUN) console.log('\n[DRY RUN] Žádné změny nebyly zapsány do DB.')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
