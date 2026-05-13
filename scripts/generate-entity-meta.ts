/**
 * Batch-generate meta_descriptions for entity pages (regions, cultivars, active brands).
 * Uses Claude Haiku — short output, low cost.
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/generate-entity-meta.ts
 *
 * Flags:
 *   --dry-run   print without writing
 *   --type=regions|cultivars|brands  (default: all)
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const HAIKU = 'claude-haiku-4-5-20251001'
const BATCH = 10
const DELAY = 400

const DRY = process.argv.includes('--dry-run')
const TYPE = process.argv.find(a => a.startsWith('--type='))?.split('=')[1]

interface Entity { id: string; slug: string; name: string; description_long: string | null; type: string }

function buildPrompt(items: Entity[]): string {
  const mapped = items.map(e => ({
    id: e.id,
    type: e.type,
    name: e.name,
    desc_snippet: (e.description_long ?? '').slice(0, 300),
  }))
  return `Vygeneruj meta_description (max 155 znaků) pro tyto entity stránky Olivator.cz.

PRAVIDLA:
- Max 155 znaků (přesně měř!)
- Čeština, aktivní hlas
- Zmínit typ entity (region / odrůda / značka) + stát/původ kde to dává smysl
- Nekončit tečkou
- Přirozeně zmínit "Olivátor" nebo "srovnávač olivových olejů"
- NE: "prémiový", "výjimečný", "ideální"
- NE: zmínky o aktuálním katalogu

PŘÍKLADY:
name: Kalamata, type: region → "Kalamata — řecký region proslulý olivami. Srovnejte EVOO z Kalamaty na Olivátoru — scores, ceny, kyselost."
name: Koroneiki, type: cultivar → "Koroneiki je nejrozšířenější řecká odrůda olivy. Polyfenoly 200–800 mg/kg, výrazná chuť. Srovnejte na Olivátoru."
name: Intini, type: brand → "Intini — italský výrobce extra panenského olivového oleje z Puglie. Odrůdy Coratina a Ogliarola. Srovnejte ceny na Olivátoru."

INPUT (vrať POUZE JSON array, bez markdownu):
${JSON.stringify(mapped, null, 2)}

Vrať:
[{"id":"...","meta_description":"..."}]`
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchEntities(): Promise<Entity[]> {
  const out: Entity[] = []

  if (!TYPE || TYPE === 'regions') {
    const { data } = await supabaseAdmin
      .from('regions')
      .select('id, slug, name, description_long, meta_description')
      .eq('status', 'active')
      .or('meta_description.is.null,meta_description.eq.')
    out.push(...(data ?? []).map(r => ({ ...r, type: 'region', description_long: r.description_long as string | null })))
  }

  if (!TYPE || TYPE === 'cultivars') {
    const { data } = await supabaseAdmin
      .from('cultivars')
      .select('id, slug, name, description_long, meta_description')
      .eq('status', 'active')
      .or('meta_description.is.null,meta_description.eq.')
    out.push(...(data ?? []).map(c => ({ ...c, type: 'cultivar', description_long: c.description_long as string | null })))
  }

  if (!TYPE || TYPE === 'brands') {
    const { data } = await supabaseAdmin
      .from('brands')
      .select('id, slug, name, description_long, meta_description')
      .eq('status', 'active')
      .or('meta_description.is.null,meta_description.eq.')
    out.push(...(data ?? []).map(b => ({ ...b, type: 'brand', description_long: b.description_long as string | null })))
  }

  return out
}

async function main() {
  const client = new Anthropic()
  const entities = await fetchEntities()
  console.log(`\nEntities bez meta_description: ${entities.length}`)
  if (DRY) console.log('DRY RUN — no writes\n')

  // Split into batches
  const batches: Entity[][] = []
  for (let i = 0; i < entities.length; i += BATCH) batches.push(entities.slice(i, i + BATCH))

  let updated = 0, failed = 0

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    process.stdout.write(`Batch ${bi + 1}/${batches.length} (${batch.length})... `)

    let results: Array<{ id: string; meta_description: string }> = []
    try {
      const resp = await client.messages.create({
        model: HAIKU,
        max_tokens: 1500,
        messages: [{ role: 'user', content: buildPrompt(batch) }],
      })
      const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
      const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      results = JSON.parse(cleaned)
    } catch (err) {
      console.error(`\n  ERR: ${(err as Error).message}`)
      failed += batch.length
      await sleep(DELAY)
      continue
    }

    const batchUpdated: Array<{ id: string; table: string; meta: string }> = []

    for (const e of batch) {
      const r = results.find(x => x.id === e.id)
      if (!r?.meta_description) { failed++; continue }

      const meta = r.meta_description.trim()
      if (meta.length < 50 || meta.length > 165) {
        console.log(`\n  SKIP ${e.slug}: délka ${meta.length} ("${meta.slice(0, 40)}...")`)
        failed++
        continue
      }

      const table = e.type === 'region' ? 'regions' : e.type === 'cultivar' ? 'cultivars' : 'brands'
      batchUpdated.push({ id: e.id, table, meta })
      updated++
    }

    if (!DRY) {
      for (const u of batchUpdated) {
        await supabaseAdmin.from(u.table as 'regions').update({ meta_description: u.meta }).eq('id', u.id)
      }
    }

    // Print samples
    batchUpdated.slice(0, 3).forEach(u => {
      const e = batch.find(x => x.id === u.id)!
      console.log(`\n    [${e.type}] ${e.name}: "${u.meta}"`)
    })
    if (batchUpdated.length > 3) process.stdout.write(`    (+${batchUpdated.length - 3} more)\n`)
    else console.log()

    await sleep(DELAY)
  }

  console.log(`\n═══ VÝSLEDKY ═══`)
  console.log(`Updated: ${updated} | Failed/skipped: ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
