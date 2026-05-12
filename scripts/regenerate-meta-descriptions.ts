// Regenerace meta descriptions + meta titles pro produkty kde Score v meta nesedí.
// Po Master Foundation Fáze 3 (1462 audit změn) má 245+ produktů nové Score,
// ale meta descriptions obsahují staré hodnoty → Google indexuje špatná čísla.
//
// Strategie: SKIP pokud Score v meta sedí s aktuálním → ušetří 50-70 % calls.
// Model: Claude Haiku (~$0.0005/produkt) → celková cena pod $0.20 pro 245 produktů.

import { supabaseAdmin } from '@/lib/supabase'
import { generateMetaDescription, generateMetaTitle } from '@/lib/content-agent'
import { createCostTracker } from '@/lib/cost-tracker'

const HARD_LIMIT_USD = 2.00
const DELAY_MS = 300

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const startedAt = Date.now()
  console.log('═══ Regenerace meta descriptions ═══')
  console.log(`Hard limit: $${HARD_LIMIT_USD}\n`)

  const tracker = createCostTracker({ hardLimitUsd: HARD_LIMIT_USD, name: 'meta-regen' })

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(`
      id, slug, name, name_short,
      origin_country, origin_region,
      type, acidity, polyphenols,
      olivator_score, certifications,
      meta_description, meta_title,
      volume_ml, packaging
    `)
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .order('name')

  if (error) throw error
  const total = products?.length ?? 0
  console.log(`Produktů s Score: ${total}\n`)

  let regenerated = 0
  let skipped = 0
  let failed = 0
  const examples: string[] = []

  for (const p of products ?? []) {
    tracker.guard()

    // Heuristika: pokud meta_description obsahuje správný Score → přeskoč
    if (p.meta_description) {
      const scoreMatch = p.meta_description.match(/Score\s+(\d+)\s*(?:\/\s*100)?/i)
      if (scoreMatch && parseInt(scoreMatch[1]) === p.olivator_score) {
        skipped++
        continue
      }
    }

    const slug = p.slug as string
    const name = p.name as string
    process.stdout.write(`  ${name.slice(0, 40).padEnd(42)} `)

    try {
      const certs: string[] = Array.isArray(p.certifications) ? p.certifications as string[] : []

      const [newDescription, newTitle] = await Promise.all([
        generateMetaDescription({
          name,
          shortDescription: null,
          originRegion: p.origin_region as string | null,
          originCountry: p.origin_country as string | null,
          acidity: p.acidity as number | null,
          polyphenols: p.polyphenols as number | null,
          certifications: certs,
          olivatorScore: p.olivator_score as number,
        }),
        generateMetaTitle({
          name,
          type: (p.type as string) || 'evoo',
          originCountry: p.origin_country as string | null,
          originRegion: p.origin_region as string | null,
          acidity: p.acidity as number | null,
          olivatorScore: p.olivator_score as number,
          certifications: certs,
          volumeMl: p.volume_ml as number | null,
        }),
      ])

      const safeDescription = newDescription.length > 160
        ? newDescription.slice(0, 157) + '...'
        : newDescription
      const safeTitle = newTitle.length > 70
        ? newTitle.slice(0, 67) + '...'
        : newTitle

      const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update({
          meta_description: safeDescription,
          meta_title: safeTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id)

      if (updateErr) throw updateErr

      // Estimated tokens: ~280 input + 50 output per call, ×2 calls
      tracker.recordUsage('claude-haiku-4-5', { input_tokens: 560, output_tokens: 100 })

      process.stdout.write(`✓ $${tracker.totalUsd().toFixed(4)}\n`)
      regenerated++

      if (examples.length < 3) {
        examples.push(`${name}: "${newDescription}"`)
      }

    } catch (err) {
      const msg = err instanceof Error
        ? err.message.slice(0, 80)
        : ((err as { message?: string })?.message ?? JSON.stringify(err)).slice(0, 100)
      process.stdout.write(`✗ ${msg}\n`)
      failed++
    }

    await delay(DELAY_MS)
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0)
  const report = tracker.report()

  console.log(`
═══ Výsledky ═══
Total produktů:    ${total}
Regenerováno:      ${regenerated}
Přeskočeno (OK):   ${skipped}
Selhalo:           ${failed}
Čas:               ${elapsed}s
Cena:              $${report.totalUsd.toFixed(4)} / $${HARD_LIMIT_USD}`)

  if (examples.length > 0) {
    console.log('\nUkázky nových meta descriptions:')
    examples.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
