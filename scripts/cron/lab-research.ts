/**
 * Standalone Lab Research cron runner.
 *
 * Pro produkty bez acidity/polyphenols zkusí dohledat z webu výrobce
 * (brands.website_url). Best effort — selhání nesmí shodit run.
 *
 * Local: npm run cron:lab-research
 * Railway: cron service s start command "npm run cron:lab-research"
 */
import { supabaseAdmin } from '@/lib/supabase'
import { researchProductLabData } from '@/lib/product-lab-research'
import { calculateScore } from '@/lib/score'

const MAX_PRODUCTS_PER_RUN = 30
const MAX_RUNTIME_MS = 15 * 60 * 1000  // 15 min hard limit

interface ProductRow {
  id: string
  name: string
  slug: string
  type: string | null
  acidity: number | null
  polyphenols: number | null
  peroxide_value: number | null
  oleic_acid_pct: number | null
  certifications: string[] | null
  volume_ml: number | null
  brand_slug: string | null
}

async function main() {
  const startedAt = Date.now()
  console.log('[cron:lab-research] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[cron:lab-research] TIMEOUT — exceeded 15 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    // 1) Najdi kandidáty bez lab dat
    const { data: candidates, error: queryErr } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, type, acidity, polyphenols, peroxide_value, oleic_acid_pct, certifications, volume_ml, brand_slug')
      .eq('status', 'active')
      .neq('type', 'flavored')
      .or('acidity.is.null,polyphenols.is.null')
      .not('brand_slug', 'is', null)
      .limit(MAX_PRODUCTS_PER_RUN * 3)
    if (queryErr) throw new Error(`Products query: ${queryErr.message}`)

    const cands = (candidates as unknown as ProductRow[]) ?? []

    // 2) Načti brand URLs (manual JOIN — brand_slug není FK)
    const brandSlugs = Array.from(new Set(cands.map(c => c.brand_slug).filter((s): s is string => !!s)))
    const { data: brands } = await supabaseAdmin
      .from('brands')
      .select('slug, website_url')
      .in('slug', brandSlugs)
      .not('website_url', 'is', null)
    const brandUrl = new Map<string, string>(
      (brands ?? []).map(b => [b.slug as string, b.website_url as string])
    )

    const eligible = cands
      .filter(p => p.brand_slug && brandUrl.has(p.brand_slug))
      .slice(0, MAX_PRODUCTS_PER_RUN)

    console.log(`[cron:lab-research] ${eligible.length} kandidátů (z ${cands.length} bez lab dat)`)

    let researched = 0
    let updated = 0
    const failures: string[] = []

    for (const p of eligible) {
      try {
        const url = brandUrl.get(p.brand_slug!)!
        process.stdout.write(`  ${p.name.slice(0, 50)} → `)

        const result = await researchProductLabData(p.name, url)
        researched++

        if (!result || result.confidence === 'low') {
          console.log(result ? `low confidence (${result.notes.slice(0, 40)})` : 'no result')
          continue
        }

        const patch: Record<string, number> = {}
        if (p.acidity == null && result.acidity != null) patch.acidity = result.acidity
        if (p.polyphenols == null && result.polyphenols != null) patch.polyphenols = result.polyphenols
        if (p.peroxide_value == null && result.peroxideValue != null) patch.peroxide_value = result.peroxideValue
        if (p.oleic_acid_pct == null && result.oleicAcidPct != null) patch.oleic_acid_pct = result.oleicAcidPct

        if (Object.keys(patch).length === 0) {
          console.log('found data but already complete')
          continue
        }

        // Recompute score po doplnění
        const merged = { ...p, ...patch }
        const { data: offers } = await supabaseAdmin
          .from('product_offers')
          .select('price')
          .eq('product_id', p.id)
          .order('price', { ascending: true })
          .limit(1)
        const cheapest = offers?.[0]?.price ? Number(offers[0].price) : null
        const pricePer100ml = cheapest && p.volume_ml ? (cheapest / p.volume_ml) * 100 : null
        const score = calculateScore({
          acidity: merged.acidity,
          certifications: merged.certifications,
          polyphenols: merged.polyphenols,
          peroxideValue: merged.peroxide_value,
          pricePer100ml,
          type: merged.type,
        })
        const dbScore = score.insufficientData ? null : score.total

        await supabaseAdmin
          .from('products')
          .update({
            ...patch,
            olivator_score: dbScore,
            score_breakdown: score.breakdown,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id)
        updated++
        console.log(`✅ ${Object.keys(patch).join(', ')} → score ${dbScore ?? 'null'}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown'
        failures.push(`${p.slug}: ${msg}`)
        console.log(`❌ ${msg.slice(0, 60)}`)
      }
    }

    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`\n[cron:lab-research] done in ${elapsedSec}s — researched: ${researched}, updated: ${updated}, failed: ${failures.length}`)
    if (failures.length > 0) {
      console.log('Failures:')
      failures.slice(0, 5).forEach(f => console.log(`  ${f}`))
    }
  } catch (err) {
    console.error('[cron:lab-research] FATAL:', err)
    process.exit(1)
  } finally {
    clearTimeout(killTimer)
  }
  process.exit(0)
}

main()
