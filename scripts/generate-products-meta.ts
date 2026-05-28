/**
 * Generates meta_description for active products that don't have one,
 * or have one shorter than 120 chars (pass --regen-short to include those).
 *
 * Run:               env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/generate-products-meta.ts
 * Include short:     env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/generate-products-meta.ts --regen-short
 * Dry run:           ... --dry-run
 */
import { supabaseAdmin } from '@/lib/supabase'
import { callClaude, extractText } from '@/lib/anthropic'

const HAIKU = 'claude-haiku-4-5-20251001'
const DELAY_MS = 2000
const DRY = process.argv.includes('--dry-run')
const REGEN_SHORT = process.argv.includes('--regen-short')

const SYSTEM_PROMPT =
  'Czech SEO meta description writer for olivator.cz (olive oil comparator). ' +
  'Write 1-2 sentences in Czech, 120-155 chars total. ' +
  'Mention: product name, type (extra panenský olivový olej / olivový olej), origin country/region, ' +
  'and 1-2 specific quality details from the data provided (Olivator Score, acidity %, polyphenols mg/kg, certifications, volume). ' +
  'No marketing fluff ("prémiový", "výjimečný", "skvělý"). ' +
  'Return ONLY the meta text, no quotes, no explanation.'

const TYPE_LABELS: Record<string, string> = {
  evoo: 'extra panenský olivový olej',
  virgin: 'panenský olivový olej',
  refined: 'rafinovaný olivový olej',
  olive_oil: 'olivový olej',
  pomace: 'olivový olej z pokrutin',
}

interface Product {
  id: string
  slug: string
  name: string
  type: string | null
  origin_country: string | null
  origin_region: string | null
  acidity: number | null
  polyphenols: number | null
  olivator_score: number | null
  certifications: string[] | null
  description_short: string | null
  volume_ml: number | null
  meta_description: string | null
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchProducts(): Promise<Product[]> {
  // In --regen-short mode fetch all active products and filter client-side;
  // otherwise only those with null/empty meta_description.
  const baseQuery = supabaseAdmin
    .from('products')
    .select('id, slug, name, type, origin_country, origin_region, acidity, polyphenols, olivator_score, certifications, description_short, volume_ml, meta_description')
    .eq('status', 'active')
    .order('name')

  const { data, error } = await (REGEN_SHORT
    ? baseQuery
    : baseQuery.or('meta_description.is.null,meta_description.eq.')
  ).returns<Product[]>()

  if (error) {
    console.error('DB query failed:', error.message)
    process.exit(1)
  }

  const products = (data ?? []) as Product[]
  if (REGEN_SHORT) {
    return products.filter(p => !p.meta_description || p.meta_description.trim().length < 120)
  }
  return products
}

function buildUserPrompt(p: Product): string {
  const lines: string[] = [
    `Název: ${p.name}`,
    `Typ: ${p.type ? (TYPE_LABELS[p.type] ?? p.type) : 'olivový olej'}`,
  ]
  if (p.origin_region) lines.push(`Oblast: ${p.origin_region}`)
  if (p.origin_country) lines.push(`Země (ISO): ${p.origin_country}`)
  if (p.olivator_score) lines.push(`Olivator Score: ${p.olivator_score}/100`)
  if (p.acidity != null) lines.push(`Kyselost: ${p.acidity} %`)
  if (p.polyphenols != null) lines.push(`Polyfenoly: ${p.polyphenols} mg/kg`)
  if (p.certifications?.length) lines.push(`Certifikace: ${p.certifications.join(', ').toUpperCase()}`)
  if (p.volume_ml) lines.push(`Objem: ${p.volume_ml} ml`)
  if (p.description_short) lines.push(`Popis: ${p.description_short.slice(0, 300)}`)
  return lines.join('\n')
}

async function generateMeta(product: Product): Promise<string | null> {
  const response = await callClaude({
    model: HAIKU,
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(product) }],
  })
  const text = extractText(response).trim()
  return text.length > 0 ? text : null
}

async function main() {
  const products = await fetchProducts()
  const mode = REGEN_SHORT ? 'null + příliš krátké (<120 zn.)' : 'null/prázdné'

  console.log(`\nProdukty bez meta_description (${mode}): ${products.length}`)
  if (DRY) console.log('DRY RUN — no writes\n')
  else console.log()

  let updated = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    process.stdout.write(`→ [${p.slug}]... `)

    try {
      const meta = await generateMeta(p)

      if (!meta) {
        process.stdout.write('❌ prázdná odpověď\n')
        failed++
      } else if (meta.length < 85 || meta.length > 158) {
        process.stdout.write(`❌ délka ${meta.length} ("${meta.slice(0, 60)}...")\n`)
        failed++
      } else {
        process.stdout.write(`✓ [${meta.length}zn] "${meta}"\n`)

        if (!DRY) {
          const { error } = await supabaseAdmin
            .from('products')
            .update({ meta_description: meta })
            .eq('id', p.id)

          if (error) {
            process.stdout.write(`   ❌ DB write failed: ${error.message}\n`)
            failed++
            updated--
          }
        }
        updated++
      }
    } catch (err) {
      process.stdout.write(`❌ ${(err as Error).message}\n`)
      failed++
    }

    if (i < products.length - 1) await sleep(DELAY_MS)
  }

  console.log(`\n═══ VÝSLEDKY ═══`)
  console.log(`Updated: ${updated} | Failed/skipped: ${failed}`)
  if (DRY) console.log('(dry run — žádné změny v DB)')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
