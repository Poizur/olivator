/**
 * Batch AI re-extraction of name_short for problematic products.
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/fix-name-short.ts
 *
 * Flags:
 *   --dry-run   → print changes without writing to DB
 *   --limit=N   → process only first N products
 */
import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync } from 'node:fs'
import { supabaseAdmin } from '@/lib/supabase'

const HAIKU = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 10
const DELAY_MS = 300 // between batches

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : Infinity

const GENERIC = new Set([
  'olivový', 'olej', 'extra', 'panenský', 'virgin', 'evoo',
  'bio', 'organic', 'olive', 'oil', 'premium', 'olivova', 'olivové',
])

interface ProductRow {
  id: string
  slug: string
  name: string
  name_short: string | null
  brand_slug: string | null
  brand_name: string | null
  certifications: string[]
  volume_ml: number | null
  origin_country: string | null
}

interface ChangeLog {
  id: string
  slug: string
  brand: string | null
  old: string | null
  new_val: string | null
  kept: boolean
  reason: string
}

function isProblematic(p: ProductRow): boolean {
  const ns = p.name_short
  const bn = (p.brand_name ?? '').toLowerCase().trim()
  if (!ns) return true
  if (ns.length < 5) return true
  if (GENERIC.has(ns.toLowerCase().trim())) return true
  if (bn && ns.toLowerCase().trim() === bn) return true
  if (/^[A-Z0-9\s\-\.]+$/.test(ns) && ns.length > 3) return true
  return false
}

function isValid(candidate: string, brandName: string | null): boolean {
  const c = candidate.trim()
  if (c.length < 5 || c.length > 30) return false
  if (GENERIC.has(c.toLowerCase())) return false
  if (brandName && c.toLowerCase() === brandName.toLowerCase()) return false
  if (/^[A-Z0-9\s\-\.]+$/.test(c) && c === c.toUpperCase() && c.length > 3) return false
  return true
}

function buildPrompt(batch: ProductRow[]): string {
  const items = batch.map(p => ({
    id: p.id,
    brand: p.brand_name ?? p.brand_slug ?? '',
    name: p.name,
    certifications: p.certifications ?? [],
    volume_ml: p.volume_ml,
    current_name_short: p.name_short,
  }))

  return `Vygeneruj name_short pro tyto produkty olivového oleje.

Cíl: 2–4 slova, distinctive, memorable, NIKDY generic.

PRAVIDLA:
1. NIKDY identical s brand (case insensitive)
2. NIKDY pure generic: "Olej", "Extra", "BIO", "Olivový", "Virgin", "EVOO", "Premium" jako samostatné slovo
3. Preferuj distinctive features v pořadí:
   a) Edition name (Family Reserve, First Harvest, Premium Gold, Platinum)
   b) Cultivar (Picual, Hojiblanca, Frantoio, Koroneiki, Arbequina, Manzanilla)
   c) Certifikace jako qualifier (DOP, PGI, BIO + jiné slovo)
   d) Origin region (Kalamata, Apulie, Kréta, Andalusie, Lakonia)
   e) Special attribute (Early Harvest, Unfiltered, Single Estate, First Cold Press)
4. Length: 5–30 chars
5. ŽÁDNÉ ALL CAPS (ani "PICUAL" — piš "Picual")
6. Čísla volume NEVKLÁDEJ (volume je jiné pole)
7. Czech pokud možno; English jen pro English edition names

PŘÍKLADY:
Brand: Lozano Červenka, name: "Premium Picual 500ml DOP Sierra Mágina" → "Picual DOP"
Brand: Castillo de Canena, name: "Family Reserve First Day of Harvest" → "Family Reserve"
Brand: Liophos, name: "LIOPHOS BIO extra virgin PGI Lakonia 750ml" → "Early Harvest BIO"
Brand: Sitia Kréta, name: "SITIA PREMIUM GOLD 0.2 Extra virgin 5L" → "Premium Gold"
Brand: Cuadrat Valley, name: "BIO Extra Virgin Elixir 500ml" → "Elixir BIO"
Brand: Evolia platinum, name: "EVOLIA PLATINUM 2000+ polyfenolů BIO 500ml" → "2000+ Polyfenolů"
Brand: Bartolini, name: "Bartolini Extra Virgin s citronem 250ml" → "S citronem"

INPUT:
${JSON.stringify(items, null, 2)}

Vrať POUZE JSON array (bez markdown, bez textu před/za):
[{"id":"...","old_name_short":"...","new_name_short":"..."}]`
}

function parseResponse(text: string): Array<{ id: string; old_name_short: string | null; new_name_short: string }> {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const client = new Anthropic()

  // 1. Fetch products + brands
  const [{ data: products }, { data: brands }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, slug, name, name_short, brand_slug, certifications, volume_ml, origin_country')
      .eq('status', 'active'),
    supabaseAdmin.from('brands').select('slug, name'),
  ])

  if (!products) { console.error('DB error fetching products'); process.exit(1) }

  const brandNameMap = new Map((brands ?? []).map(b => [b.slug as string, b.name as string]))
  const rows: ProductRow[] = products.map(p => ({
    id: p.id as string,
    slug: p.slug as string,
    name: p.name as string,
    name_short: p.name_short as string | null,
    brand_slug: p.brand_slug as string | null,
    brand_name: p.brand_slug ? (brandNameMap.get(p.brand_slug as string) ?? null) : null,
    certifications: (p.certifications as string[]) ?? [],
    volume_ml: p.volume_ml as number | null,
    origin_country: p.origin_country as string | null,
  }))

  const problematic = rows.filter(isProblematic).slice(0, LIMIT)
  console.log(`\nProblematic: ${problematic.length} produktů (limit: ${LIMIT === Infinity ? 'none' : LIMIT})`)
  if (DRY_RUN) console.log('DRY RUN — no DB writes\n')

  // 2. Batch process
  const batches: ProductRow[][] = []
  for (let i = 0; i < problematic.length; i += BATCH_SIZE) {
    batches.push(problematic.slice(i, i + BATCH_SIZE))
  }

  const log: ChangeLog[] = []
  const stats = { processed: 0, updated: 0, kept: 0, failed: 0 }

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    process.stdout.write(`Batch ${bi + 1}/${batches.length} (${batch.length} products)... `)

    let results: Array<{ id: string; old_name_short: string | null; new_name_short: string }> = []

    try {
      const resp = await client.messages.create({
        model: HAIKU,
        max_tokens: 2500,
        messages: [{ role: 'user', content: buildPrompt(batch) }],
      })
      const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
      results = parseResponse(text)
    } catch (err) {
      console.error(`\n  ERROR in batch ${bi + 1}:`, (err as Error).message)
      for (const p of batch) {
        log.push({ id: p.id, slug: p.slug, brand: p.brand_name, old: p.name_short, new_val: null, kept: true, reason: 'batch_error' })
        stats.failed++
      }
      await sleep(DELAY_MS)
      continue
    }

    // 3. Validate + collect updates
    const updates: { id: string; name_short: string }[] = []

    for (const p of batch) {
      stats.processed++
      const result = results.find(r => r.id === p.id)

      if (!result?.new_name_short) {
        log.push({ id: p.id, slug: p.slug, brand: p.brand_name, old: p.name_short, new_val: null, kept: true, reason: 'ai_no_result' })
        stats.kept++
        continue
      }

      const candidate = result.new_name_short.trim()

      if (!isValid(candidate, p.brand_name)) {
        log.push({ id: p.id, slug: p.slug, brand: p.brand_name, old: p.name_short, new_val: candidate, kept: true, reason: `invalid: ${candidate}` })
        stats.kept++
        continue
      }

      if (candidate === p.name_short) {
        log.push({ id: p.id, slug: p.slug, brand: p.brand_name, old: p.name_short, new_val: candidate, kept: true, reason: 'unchanged' })
        stats.kept++
        continue
      }

      updates.push({ id: p.id, name_short: candidate })
      log.push({ id: p.id, slug: p.slug, brand: p.brand_name, old: p.name_short, new_val: candidate, kept: false, reason: 'ok' })
      stats.updated++
    }

    // 4. DB write
    if (!DRY_RUN && updates.length > 0) {
      for (const u of updates) {
        await supabaseAdmin
          .from('products')
          .update({ name_short: u.name_short, updated_at: new Date().toISOString() })
          .eq('id', u.id)
      }
    }

    console.log(`✓ ${updates.length} updated, ${batch.length - updates.length} kept`)
    await sleep(DELAY_MS)
  }

  // 5. Report
  console.log('\n═══ VÝSLEDKY ═══════════════════════════════')
  console.log(`Processed:   ${stats.processed}`)
  console.log(`Updated:     ${stats.updated} (${Math.round(stats.updated / stats.processed * 100)}%)`)
  console.log(`Kept:        ${stats.kept}`)
  console.log(`Failed:      ${stats.failed}`)

  console.log('\n─── 30 sample changes (before → after) ─────')
  const changes = log.filter(l => !l.kept).slice(0, 30)
  changes.forEach((c, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${c.brand ?? '—'}]`)
    console.log(`      "${c.old ?? 'NULL'}" → "${c.new_val}"`)
  })

  console.log('\n─── Kept / validation failures (sample) ────')
  log.filter(l => l.kept && l.reason !== 'unchanged').slice(0, 10).forEach(c => {
    console.log(`  [${c.reason}] ${c.slug}: "${c.old}" → "${c.new_val ?? 'n/a'}"`)
  })

  // Save full log
  const logPath = '/tmp/fix-name-short-log.json'
  writeFileSync(logPath, JSON.stringify(log, null, 2))
  console.log(`\nFull log saved: ${logPath}`)
}

main().catch(e => { console.error(e); process.exit(1) })
