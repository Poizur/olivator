/**
 * Bulk meta_title generator. Pro každý aktivní produkt s NULL/empty meta_title
 * vygeneruje 50-60 char SEO title přes Haiku.
 *
 * Run: npx tsx --env-file=.env.local scripts/backfill-meta-titles.ts
 *      npx tsx --env-file=.env.local scripts/backfill-meta-titles.ts --dry-run
 *      npx tsx --env-file=.env.local scripts/backfill-meta-titles.ts --limit=10
 */
import { supabaseAdmin } from '@/lib/supabase'
import { generateMetaTitle } from '@/lib/content-agent'

const CONCURRENCY = 4
const DRY = process.argv.includes('--dry-run')
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0', 10)

interface ProductRow {
  id: string
  name: string
  slug: string
  type: string
  origin_country: string | null
  origin_region: string | null
  acidity: number | string | null
  olivator_score: number | null
  certifications: string[] | null
  volume_ml: number | null
  meta_title: string | null
}

async function processOne(p: ProductRow): Promise<{ ok: boolean; title?: string; error?: string }> {
  try {
    const title = await generateMetaTitle({
      name: p.name,
      type: p.type,
      originCountry: p.origin_country,
      originRegion: p.origin_region,
      acidity: p.acidity != null ? Number(p.acidity) : null,
      olivatorScore: p.olivator_score,
      certifications: p.certifications ?? [],
      volumeMl: p.volume_ml,
    })

    if (!title || title.length < 30) {
      return { ok: false, error: `too short (${title?.length ?? 0} chars)` }
    }
    // Hard cap 65 znaků (Google ořízne ~60). Useknout u poslední mezery.
    let final = title
    if (final.length > 65) {
      final = final.slice(0, 65).replace(/\s+\S*$/, '')
    }

    if (DRY) {
      return { ok: true, title: final }
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update({ meta_title: final, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true, title: final }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function main() {
  let query = supabaseAdmin
    .from('products')
    .select(
      'id, name, slug, type, origin_country, origin_region, acidity, olivator_score, certifications, volume_ml, meta_title'
    )
    .eq('status', 'active')
    .or('meta_title.is.null,meta_title.eq.')
    .order('olivator_score', { ascending: false, nullsFirst: false })

  if (LIMIT > 0) query = query.limit(LIMIT)

  const { data: products, error } = await query.returns<ProductRow[]>()
  if (error) {
    console.error('[meta-title] DB query failed:', error)
    process.exit(1)
  }
  if (!products || products.length === 0) {
    console.log('[meta-title] all active products already have meta_title')
    return
  }
  console.log(`[meta-title] ${DRY ? 'DRY RUN: ' : ''}generating for ${products.length} produktů (concurrency=${CONCURRENCY})`)

  let ok = 0
  let failed = 0
  const queue = [...products]
  const worker = async () => {
    while (queue.length > 0) {
      const p = queue.shift()
      if (!p) return
      const result = await processOne(p)
      if (result.ok) {
        ok++
        const prefix = DRY ? '🔍' : '✓'
        console.log(`  ${prefix} ${p.slug.slice(0, 40).padEnd(40)} → "${result.title}" (${result.title?.length ?? 0}ch)`)
      } else {
        failed++
        console.warn(`  ✗ ${p.slug.slice(0, 40).padEnd(40)} ${result.error}`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log('')
  console.log(`[meta-title] done — ok=${ok} failed=${failed}${DRY ? ' (no DB writes)' : ''}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[meta-title] fatal:', err)
  process.exit(1)
})
