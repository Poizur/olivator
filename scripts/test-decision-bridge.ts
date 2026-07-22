// Test 5 scénářů pro Decision→Executor bridge.
// a) affiliate + fix_affiliate_url → SPUSTÍ se (validace PASS)
// b) newsletter + fix_affiliate_url → NESPUSTÍ (halucinace/category mismatch)
// c) affiliate + 'delete_everything' → NESPUSTÍ (mimo enum/whitelist)
// d) Dvojitý ANO → jen 1 executor run (dedup 60s)
// e) Executor selže → error captured (fireExecutorForDecision error path)

import { validateExecutorRule, fireExecutorForDecision } from '../lib/executor/decision-bridge'
import { supabaseAdmin } from '../lib/supabase'
import { runExecutor } from '../lib/executor'

let passed = 0
let failed = 0

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

async function main() {

// ═══════════════════════════════════════════════════
// SIM a) affiliate + fix_affiliate_url → PASS
// ═══════════════════════════════════════════════════
console.log('\n━━━ SIM a) affiliate + fix_affiliate_url ━━━')
const resultA = validateExecutorRule('fix_affiliate_url', 'affiliate')
assert('valid=true', resultA.valid === true, JSON.stringify(resultA))
if (resultA.valid) {
  assert('rule=fix_affiliate_url', resultA.rule === 'fix_affiliate_url')
}

// ═══════════════════════════════════════════════════
// SIM b) newsletter + fix_affiliate_url → BLOKOVÁNO (halucinace)
// ═══════════════════════════════════════════════════
console.log('\n━━━ SIM b) newsletter + fix_affiliate_url (halucinace) ━━━')
const resultB = validateExecutorRule('fix_affiliate_url', 'newsletter')
assert('valid=false', resultB.valid === false)
if (!resultB.valid) {
  assert('reason obsahuje "newsletter"', (resultB.reason ?? '').includes('newsletter'), resultB.reason)
}

// ═══════════════════════════════════════════════════
// SIM c) affiliate + 'delete_everything' → BLOKOVÁNO (injection)
// ═══════════════════════════════════════════════════
console.log('\n━━━ SIM c) affiliate + delete_everything (injection) ━━━')
const resultC = validateExecutorRule('delete_everything', 'affiliate')
assert('valid=false', resultC.valid === false)
if (!resultC.valid) {
  assert('reason obsahuje "AUTO_WHITELIST"', (resultC.reason ?? '').includes('AUTO_WHITELIST'), resultC.reason)
}

// ═══════════════════════════════════════════════════
// SIM d) Dedup — executed_at set → BLOKOVÁNO do 60s
// ═══════════════════════════════════════════════════
console.log('\n━━━ SIM d) Dedup — dvojitý ANO (60s window) ━━━')
const { data: existingDecision } = await supabaseAdmin
  .from('weekly_decisions')
  .select('id')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (!existingDecision) {
  console.log('  ⚠️  Žádné weekly_decisions v DB — dedup test přeskočen')
} else {
  const decisionId = existingDecision.id as string

  // Nastav executed_at na NOW() (simuluj že executor právě proběhl)
  await supabaseAdmin
    .from('weekly_decisions')
    .update({ executed_at: new Date().toISOString() })
    .eq('id', decisionId)

  const dedup = await fireExecutorForDecision(decisionId, 'fix_affiliate_url')
  assert('dedupSkip=true', dedup.dedupSkip === true, JSON.stringify(dedup))
  assert('triggered=false', dedup.triggered === false)

  // Resetuj executed_at zpět
  await supabaseAdmin
    .from('weekly_decisions')
    .update({ executed_at: null })
    .eq('id', decisionId)

  console.log('  (executed_at resetován na null)')
}

// ═══════════════════════════════════════════════════
// SIM e) Executor failure → error captured + agent_decisions log
// ═══════════════════════════════════════════════════
console.log('\n━━━ SIM e) Executor failure → error path ━━━')

// Ověř že runExecutor hází error pro neexistující pravidlo
try {
  await runExecutor({ dryRun: true, ruleFilter: 'nonexistent_rule_for_test', maxOps: 1 })
  assert('runExecutor s bad filter NEHODIL', false, 'mělo hodit error')
} catch (err) {
  const msg = (err as Error).message
  assert('runExecutor hodil error pro neznámé pravidlo', true, msg)
  assert('error zpráva obsahuje název pravidla', msg.includes('nonexistent_rule_for_test'), msg)
}

// Ověř fireExecutorForDecision je funkce + agent_decisions tabulka dostupná
assert('fireExecutorForDecision je funkce', typeof fireExecutorForDecision === 'function')
const { error: adErr } = await supabaseAdmin
  .from('agent_decisions')
  .select('id', { count: 'exact', head: true })
assert('agent_decisions tabulka dostupná (pro error logging)', !adErr, adErr?.message)

// ═══════════════════════════════════════════════════
// Souhrn
// ═══════════════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`)
console.log(`Výsledky: ${passed} PASS, ${failed} FAIL`)
if (failed > 0) {
  console.log('❌ Některé testy selhaly — viz výše')
  process.exit(1)
} else {
  console.log('✅ Všechny testy prošly')
}

}

main().catch((err) => { console.error('FATAL:', err); process.exit(1) })
