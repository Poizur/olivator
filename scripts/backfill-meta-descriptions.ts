/**
 * Bulk meta_description generator. Pro každý aktivní produkt s NULL/empty
 * meta_description vygeneruje 130-160 char SEO snippet přes Haiku.
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-meta-descriptions.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { generateMetaDescription } from '@/lib/content-agent'

const CONCURRENCY = 4 // Haiku zvládá

interface ProductRow {
  id: string
  name: string
  slug: string
  description_short: string | null
  origin_country: string | null
  origin_region: string | null
  acidity: number | string | null
  polyphenols: number | null
  certifications: string[] | null
  olivator_score: number | null
  meta_description: string | null
}

async function processOne(p: ProductRow): Promise<{ ok: boolean; chars?: number; error?: string }> {
  try {
    const meta = await generateMetaDescription({
      name: p.name,
      shortDescription: p.description_short,
      originCountry: p.origin_country,
      originRegion: p.origin_region,
      acidity: p.acidity != null ? Number(p.acidity) : null,
      polyphenols: p.polyphenols,
      certifications: p.certifications ?? [],
      olivatorScore: p.olivator_score,
    })
    if (!meta || meta.length < 50) {
      return { ok: false, error: `too short (${meta?.length ?? 0} chars)` }
    }
    // Hard truncate at 160 chars (Google limit) — cut at last space if possible
    let final = meta.length <= 160 ? meta : meta.slice(0, 160).replace(/\s+\S*$/, '')
    if (final.length < 50) final = meta.slice(0, 160) // edge case fallback
    const { error } = await supabaseAdmin
      .from('products')
      .update({ meta_description: final, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true, chars: final.length }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function main() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(
      'id, name, slug, description_short, origin_country, origin_region, acidity, polyphenols, certifications, olivator_score, meta_description'
    )
    .eq('status', 'active')
    .or('meta_description.is.null,meta_description.eq.')
    .returns<ProductRow[]>()
  if (error) {
    console.error('[meta] DB query failed:', error)
    process.exit(1)
  }
  if (!products || products.length === 0) {
    console.log('[meta] all products already have meta_description')
    return
  }
  console.log(`[meta] generating for ${products.length} products (concurrency=${CONCURRENCY})`)

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
        console.log(`  ✓ ${p.slug.slice(0, 50).padEnd(50)} ${result.chars} chars`)
      } else {
        failed++
        console.warn(`  ✗ ${p.slug.slice(0, 50).padEnd(50)} ${result.error}`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log('')
  console.log(`[meta] done — ok=${ok} failed=${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[meta] fatal:', err)
  process.exit(1)
})
