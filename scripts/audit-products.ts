// Batch produktový audit s Claude Haiku.
// Fáze 3 master-foundation plánu (2026-05).
//
// Pipeline:
//   - Načte AUDIT_BATCH_LIMIT active produktů s source_url (offset = AUDIT_BATCH_OFFSET)
//   - Skip produkty co už mají audit rows (žádné duplikování práce)
//   - Pro každý → auditProductWithClaude
//     - HIGH suggestions → ihned apply do products + applied=true
//     - MEDIUM/LOW → jen log do product_data_audit
//   - Recalc Score pokud HIGH dotklo Score-affecting fields
//   - Cost limit (AUDIT_MAX_COST) hard stop
//
// Env vars:
//   AUDIT_BATCH_LIMIT   (default: 50)
//   AUDIT_BATCH_OFFSET  (default: 0)
//   AUDIT_MAX_COST      (default: 3)
//   AUDIT_DRY_RUN       (default: false)  — pokud true, žádné DB writes
//
// Spuštění:
//   env -u ANTHROPIC_API_KEY AUDIT_BATCH_LIMIT=50 AUDIT_MAX_COST=1 \
//     npx tsx --env-file=../../../.env.local scripts/audit-products.ts

import { supabaseAdmin } from '@/lib/supabase'
import {
  auditProductWithClaude,
  newAuditRunId,
} from '@/lib/product-data-audit'
import { createCostTracker, CostLimitExceededError } from '@/lib/cost-tracker'

function envInt(name: string, def: number): number {
  const v = process.env[name]
  if (!v) return def
  const n = parseInt(v, 10)
  return isNaN(n) ? def : n
}

function envFloat(name: string, def: number): number {
  const v = process.env[name]
  if (!v) return def
  const n = parseFloat(v)
  return isNaN(n) ? def : n
}

async function main() {
  const limit = envInt('AUDIT_BATCH_LIMIT', 50)
  const offset = envInt('AUDIT_BATCH_OFFSET', 0)
  const maxCost = envFloat('AUDIT_MAX_COST', 3)
  const dryRun = process.env.AUDIT_DRY_RUN === 'true' || process.env.AUDIT_DRY_RUN === '1'
  const startedAt = Date.now()

  console.log('═══ Audit Products ═══')
  console.log(`Batch limit:     ${limit}`)
  console.log(`Batch offset:    ${offset}`)
  console.log(`Max cost:        $${maxCost}`)
  console.log(`Mode:            ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log()

  const auditRunId = newAuditRunId()
  console.log(`Audit run ID: ${auditRunId}`)

  // 1. Najdi already-audited product IDs (skip)
  const { data: existingAudits } = await supabaseAdmin
    .from('product_data_audit')
    .select('product_id')
  const auditedIds = new Set<string>((existingAudits ?? []).map(r => r.product_id as string))
  console.log(`Already audited: ${auditedIds.size} produktů\n`)

  // 2. Načti batch active produktů s source_url (skip already-audited)
  const { data: candidates } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .eq('status', 'active')
    .not('source_url', 'is', null)
    .order('created_at', { ascending: false })

  const allCandidates = (candidates ?? []) as Array<{ id: string; name: string }>
  const targets = allCandidates
    .filter(c => !auditedIds.has(c.id))
    .slice(offset, offset + limit)

  console.log(`Cílových produktů: ${targets.length} (z ${allCandidates.length - auditedIds.size} ne-audited)\n`)

  if (targets.length === 0) {
    console.log('Nic k auditování — končím.')
    return
  }

  // 3. Cost tracker
  const tracker = createCostTracker({ hardLimitUsd: maxCost, name: 'audit-products' })

  // 4. Process každý produkt
  let i = 0
  let totalHighApplied = 0
  let totalMedium = 0
  let totalLow = 0
  let totalScoreChanges = 0
  let aborted = false

  for (const target of targets) {
    i++
    try {
      tracker.guard()
    } catch (err) {
      if (err instanceof CostLimitExceededError) {
        console.log(`\n⚠️  HARD COST LIMIT REACHED at product ${i}/${targets.length}`)
        console.log(`   Total: $${tracker.totalUsd().toFixed(4)} (limit $${maxCost})`)
        aborted = true
        break
      }
      throw err
    }

    const namePrefix = (target.name ?? '?').slice(0, 40)
    process.stdout.write(`[${i.toString().padStart(3)}/${targets.length}] $${tracker.totalUsd().toFixed(4).padStart(6)} ${namePrefix.padEnd(42)}`)

    try {
      const result = await auditProductWithClaude(target.id, auditRunId, tracker)

      const h = result.suggestionsByConfidence.high
      const m = result.suggestionsByConfidence.medium
      const l = result.suggestionsByConfidence.low
      totalHighApplied += result.appliedHigh
      totalMedium += m
      totalLow += l

      const flags: string[] = []
      if (result.appliedHigh > 0) flags.push(`APPLIED ${result.appliedHigh}`)
      if (m > 0) flags.push(`M:${m}`)
      if (l > 0) flags.push(`L:${l}`)
      if (result.scoreChanged) {
        flags.push(`Score ${result.scoreBefore ?? 'n/a'}→${result.scoreAfter ?? 'n/a'}`)
        totalScoreChanges++
      }
      if (result.errors.length > 0) {
        flags.push(`ERR:${result.errors.length}`)
      }
      console.log(` ${flags.join(' · ')}`)
      if (result.errors.length > 0 && !dryRun) {
        for (const e of result.errors.slice(0, 2)) console.log(`         ↳ ${e}`)
      }
    } catch (err) {
      console.log(` FATAL: ${err instanceof Error ? err.message.slice(0, 80) : 'unknown'}`)
    }
  }

  // 5. Shrnutí
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  const costReport = tracker.report()

  console.log(`\n═══ Shrnutí ${aborted ? '(ABORTED — cost limit)' : ''} ═══`)
  console.log(`Audit run ID:     ${auditRunId}`)
  console.log(`Processed:        ${i}/${targets.length}`)
  console.log()
  console.log('Suggestions:')
  console.log(`  HIGH applied:   ${totalHighApplied}`)
  console.log(`  MEDIUM logged:  ${totalMedium}`)
  console.log(`  LOW logged:     ${totalLow}`)
  console.log()
  console.log(`Score changes:    ${totalScoreChanges}`)
  console.log()
  console.log('Cost tracker:')
  console.log(`  Calls:          ${costReport.totalCalls}`)
  console.log(`  Input tokens:   ${costReport.totalInputTokens.toLocaleString()}`)
  console.log(`  Output tokens:  ${costReport.totalOutputTokens.toLocaleString()}`)
  console.log(`  Total USD:      $${costReport.totalUsd.toFixed(4)}`)
  console.log(`  Remaining:      $${costReport.remainingUsd.toFixed(4)}`)
  console.log()
  console.log(`Čas: ${elapsed}s`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
