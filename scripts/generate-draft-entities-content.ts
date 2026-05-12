// Den 1 Úkol 2 — Generovat content pro draft regions + cultivars.
//
// Volá lib funkce přímo (bez HTTP), sekvenčně s 2s pauzou.
// Hard limit $2. Nastaví status='active' po vygenerování.

import { supabaseAdmin } from '@/lib/supabase'
import { generateRegionContent } from '@/lib/entity-content-generator'
import { generateCultivarContent } from '@/lib/entity-content-generator'
import { generateRegionExtras } from '@/lib/entity-extras-generator'
import { generateCultivarExtras } from '@/lib/entity-extras-generator'
import { createCostTracker } from '@/lib/cost-tracker'

const HARD_LIMIT_USD = 2.00
const DELAY_MS = 2000

// Per-token approx cost pro Sonnet ($3/$15 per 1M)
// region content: ~600 input + 1800 output = $0.029
// region extras:  ~700 input + 800 output = $0.014
// cultivar content: ~600 input + 1600 output = $0.026
// cultivar extras: ~700 input + 800 output = $0.014
// Total per entity ~$0.043
const EST_COST_PER_ENTITY = 0.046

function countryNameCz(code: string | null): string {
  const map: Record<string, string> = {
    GR: 'Řecko', IT: 'Itálie', ES: 'Španělsko', HR: 'Chorvatsko',
    PT: 'Portugalsko', TR: 'Turecko', MA: 'Maroko', TN: 'Tunisko',
  }
  return (code && map[code]) || (code ?? 'neznámá')
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function processRegion(region: {
  id: string; name: string; slug: string; country_code: string | null
}, tracker: ReturnType<typeof createCostTracker>): Promise<{ ok: boolean; error?: string }> {
  const countryName = countryNameCz(region.country_code)

  const description = await generateRegionContent({
    name: region.name,
    countryCode: region.country_code ?? '',
    countryName,
    productCount: 0,
    topProducts: [],
    commonCultivars: [],
  })

  await supabaseAdmin
    .from('regions')
    .update({ description_long: description, updated_at: new Date().toISOString() })
    .eq('id', region.id)

  const extras = await generateRegionExtras({
    type: 'region',
    name: region.name,
    countryName,
    descriptionLong: description,
    productCount: 0,
    topProducts: [],
  })

  await supabaseAdmin
    .from('regions')
    .update({
      tldr: extras.tldr || null,
      terroir: extras.terroir,
      status: 'active',
      ai_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', region.id)

  if (extras.faqs.length > 0) {
    await supabaseAdmin.from('entity_faqs').delete().eq('entity_type', 'region').eq('entity_id', region.id)
    await supabaseAdmin.from('entity_faqs').insert(
      extras.faqs.map((f, i) => ({
        entity_type: 'region', entity_id: region.id,
        question: f.question, answer: f.answer, sort_order: i,
      }))
    )
  }

  // Record estimated cost
  tracker.recordUsage('claude-sonnet-4-6', { input_tokens: 1300, output_tokens: 2600 })
  return { ok: true }
}

async function processCultivar(cultivar: {
  id: string; name: string; slug: string; origin_country: string | null
}, tracker: ReturnType<typeof createCostTracker>): Promise<{ ok: boolean; error?: string }> {
  const description = await generateCultivarContent({
    name: cultivar.name,
    originRegions: [],
    typicalAcidity: 'proměnlivá dle oblasti',
    typicalPolyphenols: 'proměnlivé dle sklizně',
    flavorProfile: 'závisí na oblasti, klimatu a sklizni',
    productCount: 0,
    topProducts: [],
  })

  await supabaseAdmin
    .from('cultivars')
    .update({ description_long: description, updated_at: new Date().toISOString() })
    .eq('id', cultivar.id)

  const extras = await generateCultivarExtras({
    type: 'cultivar',
    name: cultivar.name,
    countriesGrown: [],
    descriptionLong: description,
    productCount: 0,
    avgPolyphenols: null,
    topProducts: [],
  })

  await supabaseAdmin
    .from('cultivars')
    .update({
      tldr: extras.tldr || null,
      nickname: extras.nickname || null,
      primary_use: extras.primary_use || null,
      pairing_pros: extras.pairing_pros ?? [],
      pairing_cons: extras.pairing_cons ?? [],
      status: 'active',
      ai_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cultivar.id)

  if (extras.faqs.length > 0) {
    await supabaseAdmin.from('entity_faqs').delete().eq('entity_type', 'cultivar').eq('entity_id', cultivar.id)
    await supabaseAdmin.from('entity_faqs').insert(
      extras.faqs.map((f, i) => ({
        entity_type: 'cultivar', entity_id: cultivar.id,
        question: f.question, answer: f.answer, sort_order: i,
      }))
    )
  }

  tracker.recordUsage('claude-sonnet-4-6', { input_tokens: 1300, output_tokens: 2400 })
  return { ok: true }
}

async function main() {
  const startedAt = Date.now()
  console.log('═══ Generování content pro draft entity ═══')
  console.log(`Hard limit: $${HARD_LIMIT_USD}\n`)

  const tracker = createCostTracker({ hardLimitUsd: HARD_LIMIT_USD, name: 'entity-content' })

  // ── Regions ──────────────────────────────────────────────────────────────────
  const { data: regions } = await supabaseAdmin
    .from('regions')
    .select('id, name, slug, country_code')
    .eq('status', 'draft')
    .order('name')

  console.log(`Draft regions: ${regions?.length ?? 0}`)
  let regOk = 0, regFail = 0

  for (const region of regions ?? []) {
    tracker.guard()
    const idx = (regions?.indexOf(region) ?? 0) + 1
    process.stdout.write(`  [${idx}/${regions?.length}] ${region.name.padEnd(25)} `)
    try {
      await processRegion(region, tracker)
      process.stdout.write(`✓ $${tracker.totalUsd().toFixed(3)}\n`)
      regOk++
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 60) : String(err)
      process.stdout.write(`✗ ${msg}\n`)
      regFail++
    }
    await delay(DELAY_MS)
  }

  // ── Cultivars ─────────────────────────────────────────────────────────────────
  const { data: cultivars } = await supabaseAdmin
    .from('cultivars')
    .select('id, name, slug, origin_country')
    .eq('status', 'draft')
    .order('name')

  console.log(`\nDraft cultivars: ${cultivars?.length ?? 0}`)
  let culOk = 0, culFail = 0

  for (const cultivar of cultivars ?? []) {
    tracker.guard()
    const idx = (cultivars?.indexOf(cultivar) ?? 0) + 1
    process.stdout.write(`  [${idx}/${cultivars?.length}] ${cultivar.name.padEnd(30)} `)
    try {
      await processCultivar(cultivar, tracker)
      process.stdout.write(`✓ $${tracker.totalUsd().toFixed(3)}\n`)
      culOk++
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 60) : String(err)
      process.stdout.write(`✗ ${msg}\n`)
      culFail++
    }
    await delay(DELAY_MS)
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0)
  const report = tracker.report()
  console.log(`
═══ Shrnutí ═══
Regions:   ${regOk} OK, ${regFail} failed
Cultivars: ${culOk} OK, ${culFail} failed
Čas:       ${elapsed}s
Cost:      $${report.totalUsd.toFixed(3)} / $${HARD_LIMIT_USD}
`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
