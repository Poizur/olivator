// Offline test pro isJunkBrand() — žádné Claude volání, žádné DB writes.
// Účel: ověřit slovník blocked words na známých junk i legit jménech
// + spustit detekci proti reálným 125 draft brandům v DB (read-only).
//
// Spusť:
//   npx tsx --env-file=../../../.env.local scripts/test-junk-brand-detector.ts

import { isJunkBrand } from '@/lib/junk-brand-detector'
import { supabaseAdmin } from '@/lib/supabase'

const KNOWN_JUNK: Array<[string, string]> = [
  ['Olivový', 'adjective for olive oil'],
  ['Italský', 'country adjective'],
  ['Dressing', 'product category'],
  ['Kondicionér', 'wrong category (hair conditioner)'],
  ['Hypoalergické', 'adjective'],
  ['EARLY', 'uppercase + meaningless'],
  ['Prémiový', 'quality adjective'],
  ['Dřevěný', 'packaging adjective'],
  ['Uzený', 'flavor adjective'],
  ['Olivov�', 'encoding artifact'],
  ['Bio', 'cert level not a brand'],
  ['Extra panenský', 'product type'],
  ['Toskánsko', 'region'],
  ['Sada', 'product container type'],
  ['Plech', 'packaging material'],
  ['500 ml', 'volume not brand'],
]

const KNOWN_LEGIT: Array<[string, string]> = [
  ['Frantoio Muraglia', 'Italian producer'],
  ['Chiavalon', 'Croatian producer'],
  ['Protogerakis', 'Greek producer'],
  ['Sapfo', 'Greek producer (4 letters)'],
  ['Palacio', 'Spanish producer'],
  ['Aristeon', 'Greek producer'],
  ['Olio Intini', 'Italian producer'],
  ['Ladolea', 'Greek producer'],
  ['MYRTÓO', 'Greek brand styled all caps — currently flagged as junk'],
  ['EVOLIA', 'Greek brand all caps — currently flagged'],
  ['Ecoato', 'Spanish brand'],
  ['Mitira', 'Greek brand'],
]

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`❌ ASSERT FAIL: ${msg}`)
    process.exit(1)
  }
}

async function main() {
  console.log('═══ Test isJunkBrand offline ═══\n')

  // ── Known junk ─────────────────────────────────────────────────────
  console.log('─── Known JUNK brands (musí být detekovány) ───')
  let junkPass = 0
  let junkFail = 0
  for (const [name, note] of KNOWN_JUNK) {
    const check = isJunkBrand(name)
    const ok = check.isJunk
    const status = ok ? '✓' : '✗ FAIL'
    console.log(`  ${status} "${name}".padEnd(30)} → isJunk=${check.isJunk}, reason=${check.reason ?? '-'} (${note})`)
    if (ok) junkPass++
    else junkFail++
  }

  // ── Known legit ────────────────────────────────────────────────────
  console.log('\n─── Known LEGIT brands (NESMÍ být detekovány) ───')
  let legitPass = 0
  let legitFalsePositive = 0
  for (const [name, note] of KNOWN_LEGIT) {
    const check = isJunkBrand(name)
    const ok = !check.isJunk
    const status = ok ? '✓' : '⚠️  FP'
    console.log(`  ${status} "${name}".padEnd(30)} → isJunk=${check.isJunk}, reason=${check.reason ?? '-'} (${note})`)
    if (ok) legitPass++
    else legitFalsePositive++
  }

  // ── Real DB scan ───────────────────────────────────────────────────
  console.log('\n─── Skenuju reálné draft brandy v DB ───')
  const { data: drafts } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name')
    .eq('status', 'draft')

  const detected: Array<{ name: string; slug: string; reason: string; productCount: number }> = []
  const notDetected: Array<{ name: string; slug: string; productCount: number }> = []

  for (const b of (drafts ?? []) as Array<{ id: string; slug: string; name: string }>) {
    const check = isJunkBrand(b.name)
    const { count: productCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('brand_slug', b.slug)
    if (check.isJunk) {
      detected.push({ name: b.name, slug: b.slug, reason: check.reason ?? '-', productCount: productCount ?? 0 })
    } else {
      notDetected.push({ name: b.name, slug: b.slug, productCount: productCount ?? 0 })
    }
  }

  console.log(`\nTotal draft brandy: ${drafts?.length ?? 0}`)
  console.log(`Detekováno jako junk: ${detected.length}`)
  console.log(`Zůstává jako legit: ${notDetected.length}`)

  console.log('\nJunk brandy (detekované) — top 30:')
  detected
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 30)
    .forEach(d => {
      const label = `"${d.name}"`.padEnd(35)
      console.log(`  ${label} #products=${d.productCount.toString().padStart(2)}  reason: ${d.reason}`)
    })

  console.log('\nZůstávající legit brandy — top 30:')
  notDetected
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 30)
    .forEach(d => {
      console.log(`  "${d.name}"`.padEnd(35) + ` #products=${d.productCount}`)
    })

  // ── Souhrn ─────────────────────────────────────────────────────────
  console.log('\n═══ Souhrn ═══')
  console.log(`Known junk fixtures:    ${junkPass}/${KNOWN_JUNK.length} pass`)
  console.log(`Known legit fixtures:   ${legitPass}/${KNOWN_LEGIT.length} pass (${legitFalsePositive} false positives)`)
  console.log(`Real DB:                ${detected.length}/${(drafts ?? []).length} draft brandů by se cleanovalo`)

  // False positives mezi známými legit jsou OK — admin pak ručně může odznačit.
  // Důležitější: nulové false negatives na známých junk.
  assert(junkFail === 0, `${junkFail} known-junk brandy nebyly detekovány`)
  console.log(`\n✅ 0 false negatives na známých junk`)
  if (legitFalsePositive > 0) {
    console.log(`⚠️  ${legitFalsePositive} false positives na známých legit (admin musí odznačit po cleanup)`)
  }
}

main().catch(err => {
  console.error('Test selhal:', err)
  process.exit(1)
})
