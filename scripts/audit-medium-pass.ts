// 2nd pass audit — re-evaluate MEDIUM rows v product_data_audit.
// Fáze 3 master-foundation plánu (2026-05).
//
// Pipeline:
//   1. Najdi všechny product_id co mají pending MEDIUM rows
//   2. Sort sestupně podle # MEDIUM rows per product (max impact first)
//   3. Pro každý → auditMediumPassForProduct (lean Claude prompt)
//   4. Sleduj Score before/after pro top 10 reportu
//   5. Hard cost limit (default $0.75)
//
// Spuštění:
//   env -u ANTHROPIC_API_KEY npx tsx --env-file=../../../.env.local scripts/audit-medium-pass.ts

import { supabaseAdmin } from '@/lib/supabase'
import { auditMediumPassForProduct } from '@/lib/product-data-audit'
import { createCostTracker, CostLimitExceededError } from '@/lib/cost-tracker'

const HARD_LIMIT_USD = parseFloat(process.env.MEDIUM_PASS_MAX_COST ?? '0.75')

interface ScoreChange {
  productId: string
  productName: string
  before: number | null
  after: number | null
  delta: number
}

async function main() {
  const startedAt = Date.now()

  console.log('═══ Medium Pass — Re-evaluate MEDIUM rows ═══')
  console.log(`Hard cost limit: $${HARD_LIMIT_USD}`)
  console.log()

  // 1. Najdi produkty s pending MEDIUMs, seřaď po počtu MEDIUMs
  const { data: mediums } = await supabaseAdmin
    .from('product_data_audit')
    .select('product_id')
    .eq('applied', false)
    .eq('dismissed', false)
    .eq('confidence', 'medium')

  const countByProduct = new Map<string, number>()
  for (const r of mediums ?? []) {
    const pid = r.product_id as string
    countByProduct.set(pid, (countByProduct.get(pid) ?? 0) + 1)
  }

  const targets = [...countByProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pid]) => pid)

  console.log(`Total MEDIUM rows: ${mediums?.length ?? 0}`)
  console.log(`Unique products: ${targets.length}\n`)

  if (targets.length === 0) {
    console.log('Nic k re-evaluaci.')
    return
  }

  const tracker = createCostTracker({ hardLimitUsd: HARD_LIMIT_USD, name: 'medium-pass' })

  let i = 0
  let processedProducts = 0
  let totalUpgraded = 0
  let totalDemoted = 0
  let totalKept = 0
  let totalFailed = 0
  let aborted = false
  const scoreChanges: ScoreChange[] = []

  for (const productId of targets) {
    i++
    try {
      tracker.guard()
    } catch (err) {
      if (err instanceof CostLimitExceededError) {
        console.log(`\n⚠️  HARD COST LIMIT REACHED at product ${i}/${targets.length}`)
        aborted = true
        break
      }
      throw err
    }

    try {
      const result = await auditMediumPassForProduct(productId, tracker)
      processedProducts++
      totalUpgraded += result.upgradedToHigh
      totalDemoted += result.demotedToLow
      totalKept += result.keptMedium

      const namePrefix = (result.productName ?? '?').slice(0, 45)
      const flags: string[] = []
      if (result.upgradedToHigh > 0) flags.push(`↑HIGH ${result.upgradedToHigh}`)
      if (result.demotedToLow > 0) flags.push(`↓LOW ${result.demotedToLow}`)
      if (result.keptMedium > 0) flags.push(`=MED ${result.keptMedium}`)
      if (result.scoreChanged) {
        const delta = (result.scoreAfter ?? 0) - (result.scoreBefore ?? 0)
        flags.push(`Score ${result.scoreBefore ?? 'n/a'}→${result.scoreAfter ?? 'n/a'} (${delta > 0 ? '+' : ''}${delta})`)
        scoreChanges.push({
          productId,
          productName: result.productName,
          before: result.scoreBefore,
          after: result.scoreAfter,
          delta,
        })
      }
      if (result.errors.length > 0) flags.push(`ERR:${result.errors.length}`)

      console.log(
        `[${i.toString().padStart(3)}/${targets.length}] $${tracker.totalUsd().toFixed(4).padStart(6)} ${namePrefix.padEnd(47)} ${flags.join(' · ')}`
      )
      if (result.errors.length > 0) {
        for (const e of result.errors.slice(0, 2)) console.log(`         ↳ ${e}`)
      }
    } catch (err) {
      totalFailed++
      console.log(`[${i}/${targets.length}] FATAL: ${err instanceof Error ? err.message.slice(0, 80) : 'unknown'}`)
    }
  }

  // ── Shrnutí ──
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  const costReport = tracker.report()
  console.log(`\n═══ Shrnutí ${aborted ? '(ABORTED — cost limit)' : ''} ═══`)
  console.log(`Processed products:    ${processedProducts}/${targets.length}`)
  console.log()
  console.log('Re-evaluace MEDIUM rows:')
  console.log(`  ↑ Upgraded HIGH (applied):  ${totalUpgraded}`)
  console.log(`  ↓ Demoted LOW (dismissed):  ${totalDemoted}`)
  console.log(`  = Kept MEDIUM (admin todo): ${totalKept}`)
  console.log(`  Failed:                     ${totalFailed}`)
  console.log()
  console.log(`Score changes: ${scoreChanges.length}`)
  console.log()
  console.log('Cost tracker:')
  console.log(`  Calls:        ${costReport.totalCalls}`)
  console.log(`  Input:        ${costReport.totalInputTokens.toLocaleString()}`)
  console.log(`  Output:       ${costReport.totalOutputTokens.toLocaleString()}`)
  console.log(`  Total USD:    $${costReport.totalUsd.toFixed(4)}`)
  console.log(`  Remaining:    $${costReport.remainingUsd.toFixed(4)}`)
  console.log()
  console.log(`Čas: ${elapsed}s`)

  // ── Score change tracking — full pass (Fáze 3 retrospective) ──
  console.log('\n─── Top 10 absolutních Score změn (NAPŘÍČ celou Fází 3) ───')
  // Pro celkový obraz pošli i Score changes z 1st pass: dotaž products
  // s nedávnými updated_at + score_breakdown a porovnej s historií snapshot.
  // Pro 2nd pass jen tady track. 1st pass score skoky musí admin spot-check
  // přes audit_run_id v product_data_audit.
  await reportTop10ScoreChangesAcrossPhase3()
}

async function reportTop10ScoreChangesAcrossPhase3() {
  // Najdi produkty s recent updated_at + olivator_score, porovnej s předchozí
  // hodnotou v price_history... bohužel není historie score. Místo toho:
  // pro každý produkt co byl v product_data_audit cílem během Fáze 3,
  // ukáž currentScore + co se mohlo změnit (acidity/polyphenols/cert/type).
  const { data: auditedProducts } = await supabaseAdmin
    .from('product_data_audit')
    .select('product_id, applied_at')
    .eq('applied', true)
    .not('applied_at', 'is', null)
    .gte('applied_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const uniqueIds = [...new Set((auditedProducts ?? []).map(r => r.product_id as string))]
  if (uniqueIds.length === 0) {
    console.log('  (žádné audited rows v posledních 24h)')
    return
  }

  // Pull current Score for these
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, olivator_score, score_breakdown')
    .in('id', uniqueIds)
    .not('olivator_score', 'is', null)

  // Pro admin spot-check: jen seřaď podle score (vysoké score = potenciálně
  // skoková změna z původně chybějících dat). Bez baseline nelze přesně
  // určit delta, ale top score produkty z této kohorty jsou hot candidates
  // pro spot-check.
  const sorted = (products ?? [])
    .map(p => ({
      id: p.id as string,
      name: p.name as string,
      score: p.olivator_score as number,
      breakdown: p.score_breakdown as Record<string, number>,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  console.log('  Top 10 produktů s nejvyšším current Score z auditované kohorty:')
  console.log('  (admin: ověř že high Score nejsou důsledkem chybně extrahované acidity/polyphenols)')
  for (const p of sorted) {
    console.log(`    ${p.score.toString().padStart(3)}/100  ${p.name.slice(0, 55)}`)
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
