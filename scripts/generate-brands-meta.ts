/**
 * Generates meta_description for active brands that don't have one yet.
 * Uses Claude Haiku — short output, low cost, 1 brand per 2s rate limit.
 *
 * Run:     npx tsx --env-file=.env.local scripts/generate-brands-meta.ts
 * Dry run: npx tsx --env-file=.env.local scripts/generate-brands-meta.ts --dry-run
 *
 * Note: Do NOT prepend `env -u ANTHROPIC_API_KEY` — callClaude handles auth correctly.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { callClaude, extractText } from '@/lib/anthropic'

const HAIKU = 'claude-haiku-4-5-20251001'
const DELAY_MS = 2000
const DRY = process.argv.includes('--dry-run')

const SYSTEM_PROMPT =
  'Czech SEO meta description writer for olivator.cz (olive oil comparator). ' +
  'Write 1 sentence in Czech, 130-155 chars, mentioning brand name, product type ' +
  '(olivový olej / extra panenský olivový olej), and country/region if available. ' +
  'No marketing fluff. Return ONLY the meta text, no quotes.'

interface Brand {
  id: string
  slug: string
  name: string
  short_description: string | null
  country_of_origin: string | null
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, short_description, country_of_origin')
    .eq('status', 'active')
    .or('meta_description.is.null,meta_description.eq.')
    .order('name')
    .returns<Brand[]>()

  if (error) {
    console.error('DB query failed:', error.message)
    process.exit(1)
  }
  return data ?? []
}

async function generateMeta(brand: Brand): Promise<string | null> {
  const userPrompt =
    `Značka: ${brand.name}\n` +
    `Původ: ${brand.country_of_origin ?? 'neznámý'}\n` +
    `Popis: ${brand.short_description ?? 'není'}`

  const response = await callClaude({
    model: HAIKU,
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = extractText(response).trim()
  return text.length > 0 ? text : null
}

async function main() {
  const brands = await fetchBrands()

  console.log(`\nBrandy bez meta_description: ${brands.length}`)
  if (DRY) console.log('DRY RUN — no writes\n')
  else console.log()

  let updated = 0
  let failed = 0

  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i]
    process.stdout.write(`→ [${brand.slug}]... `)

    try {
      const meta = await generateMeta(brand)

      if (!meta) {
        process.stdout.write('❌ prázdná odpověď\n')
        failed++
      } else if (meta.length < 120 || meta.length > 160) {
        process.stdout.write(`❌ délka ${meta.length} mimo rozsah ("${meta.slice(0, 50)}...")\n`)
        failed++
      } else {
        process.stdout.write(`✓ "${meta}"\n`)

        if (!DRY) {
          const { error } = await supabaseAdmin
            .from('brands')
            .update({ meta_description: meta })
            .eq('id', brand.id)

          if (error) {
            process.stdout.write(`   ❌ DB write failed: ${error.message}\n`)
            failed++
            updated-- // undo optimistic count
          }
        }
        updated++
      }
    } catch (err) {
      process.stdout.write(`❌ ${(err as Error).message}\n`)
      failed++
    }

    if (i < brands.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\n═══ VÝSLEDKY ═══`)
  console.log(`Updated: ${updated} | Failed/skipped: ${failed}`)
  if (DRY) console.log('(dry run — žádné změny v DB)')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
