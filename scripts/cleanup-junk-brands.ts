// One-time cleanup of all 125 draft junk brands.
// Fáze 2 master-foundation plánu (2026-05).
//
// Pipeline:
//   1. Pro každý draft brand → isJunkBrand() deterministická detekce
//   2. Pro detekované → reassignAndDeleteJunkBrand():
//      - Claude Haiku re-extract producer z raw_description
//      - findOrCreateBrand(realProducer)
//      - Re-link produkty na správný brand
//      - Smaž junk pokud VŠECHNY produkty re-přiřazeny
//      - Flagne (tldr = "[JUNK] ...") pokud částečně OK / žádný re-extract
//
// Bezpečnost:
//   - Hard cost limit $3 (CLAUDE.md sekce 0: cost tracker povinný)
//   - Dry-run mode (--dry-run): jen ukáže co by se stalo
//   - Žádný produkt neztratí brand_slug bez existujícího náhradního brandu
//
// Spuštění:
//   npx tsx --env-file=.env.local scripts/cleanup-junk-brands.ts --dry-run
//   npx tsx --env-file=.env.local scripts/cleanup-junk-brands.ts
//   npx tsx --env-file=.env.local scripts/cleanup-junk-brands.ts --limit=5

import { runJunkBrandCleanup, type ReassignmentResult } from '@/lib/junk-brand-detector'
import { createCostTracker } from '@/lib/cost-tracker'

const HARD_LIMIT_USD = 3.0

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    limit: (() => {
      const m = args.find(a => a.startsWith('--limit='))
      return m ? parseInt(m.split('=')[1], 10) : undefined
    })(),
  }
}

function formatAction(action: ReassignmentResult['action']): string {
  const labels: Record<ReassignmentResult['action'], string> = {
    deleted_empty: '🗑️  smazáno (prázdný)',
    deleted_after_reassign: '✅ smazáno (re-přiřazeno)',
    flagged_partial: '⚠️  flagged (částečné)',
    flagged_no_extraction: '❌ flagged (no extract)',
    kept_not_junk: '👌 ponecháno (not junk)',
  }
  return labels[action] ?? action
}

async function main() {
  const args = parseArgs()
  const startedAt = Date.now()

  console.log('═══ Junk Brand Cleanup ═══')
  console.log(`Mode: ${args.dryRun ? 'DRY RUN (žádné DB změny)' : 'LIVE'}`)
  console.log(`Hard cost limit: $${HARD_LIMIT_USD}`)
  if (args.limit) console.log(`Limit: ${args.limit} brandů (test mode)`)
  console.log()

  const costTracker = createCostTracker({
    hardLimitUsd: HARD_LIMIT_USD,
    name: 'junk-brand-cleanup',
  })

  let processed = 0
  const summary = await runJunkBrandCleanup({
    costTracker,
    dryRun: args.dryRun,
    limit: args.limit,
    onProgress: (i, total, result) => {
      processed = i + 1
      const progress = `[${(processed).toString().padStart(3)}/${total}]`
      const cost = `$${costTracker.totalUsd().toFixed(4)}`
      const action = formatAction(result.action)
      const counts = result.productCount > 0
        ? ` (${result.reassigned}/${result.productCount} reassigned${result.failed > 0 ? `, ${result.failed} fail` : ''}${result.skippedNoSourceUrl > 0 ? `, ${result.skippedNoSourceUrl} no-url` : ''})`
        : ''
      console.log(`${progress} ${cost.padStart(8)}  ${action.padEnd(28)} "${result.brandName}"${counts}`)
      if (result.errors.length > 0 && !args.dryRun) {
        for (const e of result.errors.slice(0, 3)) {
          console.log(`         ↳ ${e}`)
        }
      }
    },
  })

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  const costReport = costTracker.report()

  console.log('\n═══ Shrnutí ═══')
  console.log(`Total draft brandy v DB: ${summary.totalDraftBrands}`)
  console.log(`Detekováno jako junk:    ${summary.junkDetected}`)
  console.log()
  console.log('Akce:')
  console.log(`  🗑️  Smazáno prázdných:           ${summary.deletedEmpty}`)
  console.log(`  ✅  Smazáno po re-přiřazení:     ${summary.deletedAfterReassign}`)
  console.log(`  ⚠️   Flagged částečně OK:         ${summary.flaggedPartial}`)
  console.log(`  ❌  Flagged bez extract:         ${summary.flaggedNoExtraction}`)
  console.log(`  👌  Ponecháno (recheck not junk): ${summary.keptNotJunk}`)
  console.log()
  console.log('Produkty:')
  console.log(`  Dotčené (pod junk brandy):       ${summary.totalProductsTouched}`)
  console.log(`  Re-přiřazené na správný brand:   ${summary.totalReassigned}`)
  console.log(`  Selhání:                         ${summary.totalFailed}`)
  console.log(`  Skip (no source_url):            ${summary.totalSkippedNoSourceUrl}`)
  console.log()
  console.log('Cost tracker:')
  console.log(`  Total Claude calls:              ${costReport.totalCalls}`)
  console.log(`  Input tokens:                    ${costReport.totalInputTokens.toLocaleString()}`)
  console.log(`  Output tokens:                   ${costReport.totalOutputTokens.toLocaleString()}`)
  console.log(`  Total USD:                       $${costReport.totalUsd.toFixed(4)}`)
  console.log(`  Remaining (z $${HARD_LIMIT_USD}):              $${costReport.remainingUsd.toFixed(4)}`)
  console.log()
  console.log(`Čas: ${elapsedSec}s`)

  // Save detailed log
  if (!args.dryRun) {
    const flagged = summary.results.filter(
      r => r.action === 'flagged_partial' || r.action === 'flagged_no_extraction'
    )
    if (flagged.length > 0) {
      console.log('\n⚠️  Brandy které vyžadují admin review (filtrovat v /admin/brands):')
      for (const r of flagged) {
        console.log(`   ${r.brandName.padEnd(30)} slug=${r.brandSlug.padEnd(25)} ${formatAction(r.action)}`)
      }
      console.log('\n   Filter pattern: tldr ILIKE \'[JUNK]%\'')
    }
  }

  process.exit(0)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
