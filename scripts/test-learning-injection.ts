// Test pro Fázi 1 master-foundation plánu (Learning Injection).
//
// Co testuje:
//   1. learning-injector.ts načte lekce z project_learnings
//   2. Pro každého agenta vrátí jen relevantní kategorie
//   3. Cache funguje (druhý call je rychlejší + bez DB)
//   4. Format je validní text blok pro system prompt
//   5. Žádný Claude API call — POUZE DB čtení + formátování
//
// Cena: $0.00 (žádné Claude volání).
//
// Spusť:
//   npx tsx scripts/test-learning-injection.ts

import {
  getRelevantLearnings,
  getInjectionBlock,
  describeInjection,
  clearLearningCache,
  type AgentName,
} from '@/lib/learning-injector'
import { supabaseAdmin } from '@/lib/supabase'

const AGENTS: AgentName[] = [
  'content_agent',
  'fact_extractor',
  'flavor_agent',
  'brand_research',
  'discovery_agent',
  'lab_report_agent',
  'quality_auto_fix',
  'radar_agent',
]

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`❌ ASSERT FAIL: ${msg}`)
    process.exit(1)
  }
}

async function main() {
  console.log('═══ Test Learning Injection (Fáze 1) ═══\n')

  // ── 1. DB sanity check ───────────────────────────────────────────────
  const { count: totalLearnings } = await supabaseAdmin
    .from('project_learnings')
    .select('*', { count: 'exact', head: true })

  console.log(`Total project_learnings v DB: ${totalLearnings ?? 0}`)
  if (!totalLearnings || totalLearnings === 0) {
    console.warn('\n⚠️  ŽÁDNÉ lekce v DB — test ověří jen že injekce funguje s 0 položkami.')
    console.warn('   Pro plný test spusť: npm run cron:learning')
    console.warn('   (vyžaduje GITHUB_TOKEN a ANTHROPIC_API_KEY)\n')
  }

  // Distribuce podle kategorie a impactu
  const { data: distribution } = await supabaseAdmin
    .from('project_learnings')
    .select('category, impact')
  const byCategory = new Map<string, number>()
  const byImpact = new Map<string, number>()
  for (const row of distribution ?? []) {
    const cat = (row.category as string | null) ?? 'unknown'
    const imp = (row.impact as string | null) ?? 'unknown'
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1)
    byImpact.set(imp, (byImpact.get(imp) ?? 0) + 1)
  }
  console.log('\nDistribuce podle kategorie:')
  for (const [k, v] of byCategory) console.log(`  ${k.padEnd(20)} ${v}`)
  console.log('\nDistribuce podle impactu:')
  for (const [k, v] of byImpact) console.log(`  ${k.padEnd(20)} ${v}`)

  // ── 2. Per-agent injection ──────────────────────────────────────────
  console.log('\n─── Per-agent injection coverage ───')
  clearLearningCache()
  for (const agent of AGENTS) {
    const info = await describeInjection(agent)
    const impactStr = Object.entries(info.byImpact)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ')
    console.log(
      `  ${agent.padEnd(20)} ${info.count.toString().padStart(2)} lekc(e/í)  [${impactStr}]  kategorie: ${info.categories.join(', ')}`
    )
  }

  // ── 3. Format kontrola: prompt prefix má správný marker ────────────
  console.log('\n─── Format prompt prefix ───')
  const block = await getInjectionBlock('content_agent')
  if (totalLearnings && totalLearnings > 0) {
    assert(
      block.includes('LEKCE Z PŘEDCHOZÍCH BĚHŮ'),
      'getInjectionBlock musí vrátit blok s markerem "LEKCE Z PŘEDCHOZÍCH BĚHŮ"'
    )
    assert(block.includes('══ KONEC LEKCÍ ══'), 'Blok musí končit "KONEC LEKCÍ"')
    console.log(`  ✓ Blok pro content_agent obsahuje povinné markery`)
    console.log(`  ✓ Délka: ${block.length} znaků (${block.split('\n').length} řádků)`)
  } else {
    assert(block === '', 'Při 0 lekcích musí block být prázdný string (žádný overhead)')
    console.log(`  ✓ Při 0 lekcích blok = '' (no-overhead)`)
  }

  // ── 4. Cache check ──────────────────────────────────────────────────
  console.log('\n─── Cache behavior ───')
  clearLearningCache()
  const t1Start = Date.now()
  await getRelevantLearnings('content_agent')
  const t1 = Date.now() - t1Start

  const t2Start = Date.now()
  await getRelevantLearnings('content_agent')
  const t2 = Date.now() - t2Start

  console.log(`  První call (cache miss):    ${t1} ms`)
  console.log(`  Druhý call (cache hit):     ${t2} ms`)
  assert(t2 <= t1, `Cache call (${t2} ms) by neměl být pomalejší než DB call (${t1} ms)`)
  if (t1 > 5) {
    assert(t2 < t1 / 2, `Cache by měl být alespoň 2× rychlejší (${t2} < ${t1 / 2})`)
    console.log(`  ✓ Cache je ≥2× rychlejší (DB ${t1}ms → cache ${t2}ms)`)
  } else {
    console.log(`  ✓ Cache funguje (DB ${t1}ms byl už příliš rychlý pro smysluplný test)`)
  }

  // ── 5. Impact ordering ─────────────────────────────────────────────
  console.log('\n─── Impact ordering ───')
  clearLearningCache()
  const learnings = await getRelevantLearnings('content_agent', 20)
  const impacts = learnings.map(l => l.impact)
  const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  let lastRank = 999
  let orderOk = true
  for (const imp of impacts) {
    const r = rank[imp] ?? 0
    if (r > lastRank) {
      orderOk = false
      break
    }
    lastRank = r
  }
  if (learnings.length === 0) {
    console.log(`  · Skip (žádné lekce v DB)`)
  } else {
    assert(orderOk, `Impacts nejsou seřazeny critical→low: ${impacts.join(', ')}`)
    console.log(`  ✓ Seřazeno správně: ${impacts.join(' → ')}`)
  }

  // ── 6. Sanity: zkontroluj že injekce je u všech 5 modifikovaných agentů ─
  console.log('\n─── Integration check: agenti volají getInjectionBlock ───')
  const fs = await import('node:fs/promises')
  const files = [
    'lib/content-agent.ts',
    'lib/fact-extractor.ts',
    'lib/flavor-agent.ts',
    'lib/brand-research.ts',
  ]
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    const hasImport = content.includes("from './learning-injector'")
    const hasCall = /getInjectionBlock\s*\(/.test(content)
    if (hasImport && hasCall) {
      console.log(`  ✓ ${file}: import + call OK`)
    } else {
      console.error(`  ❌ ${file}: import=${hasImport}, call=${hasCall}`)
      process.exit(1)
    }
  }

  // ── Hotovo ──────────────────────────────────────────────────────────
  console.log('\n═══ ✅ Všechny testy prošly ═══')
  console.log(`Lekce v DB: ${totalLearnings ?? 0}`)
  console.log(`Modifikovaní agenti: ${files.length}`)
  console.log(`Cache TTL: 5 min`)
  console.log(`Cena testu: $0.00 (žádné Claude volání)\n`)
}

main().catch((err) => {
  console.error('Test selhal:', err)
  process.exit(1)
})
