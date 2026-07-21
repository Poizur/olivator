// Autonomní Executor — denně 06:00 UTC
// Automaticky opravuje bezpečné, ověřitelné problémy:
//   1. fix_broken_token — {{product:slug}} na neaktivní produkt
//   2. fix_affiliate_url — doplní affiliate_url z base_tracking_url šablony
//   3. recalc_score — přepočítá score pro produkty s NULL score ale existujícími daty
//
// Flags:
//   --dry-run       Jen zobrazí co BY udělal, neprovede nic
//   --rule=NAME     Spustí jen jedno pravidlo
//   --max=N         Max N aplikovaných operací (default 50)
//
// Safety brakes (vždy aktivní i bez --dry-run):
//   - > 20 % selhání → log eskalace + exit 1
//   - Každá operace logována do executor_operations
import { runExecutor } from '@/lib/executor'

const MAX_RUNTIME_MS = 15 * 60 * 1000

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const ruleArg = args.find(a => a.startsWith('--rule='))
  const ruleFilter = ruleArg ? ruleArg.split('=')[1] : undefined
  const maxArg = args.find(a => a.startsWith('--max='))
  const maxOps = maxArg ? parseInt(maxArg.split('=')[1], 10) : 50

  const killTimer = setTimeout(() => {
    console.error('[executor] TIMEOUT — exceeded 15 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  console.log(`[executor] start ${new Date().toISOString()} dry-run=${dryRun} rule=${ruleFilter ?? 'all'} maxOps=${maxOps}`)

  try {
    const report = await runExecutor({ dryRun, ruleFilter, maxOps, triggeredBy: 'daily_scan' })

    console.log('\n[executor] === VÝSLEDEK ===')
    console.log(`Pravidla: ${report.rulesRun.join(', ')}`)
    console.log(`Celkem operací: ${report.totalOps} | Applied: ${report.applied} | Skipped: ${report.skipped} | Failed: ${report.failed}`)
    if (report.dryRun) console.log('(DRY-RUN — nic nebylo uloženo)')

    if (report.failRate > 0.2 && report.totalOps >= 5) {
      console.error(`[executor] ESKALACE: fail rate ${(report.failRate * 100).toFixed(0)}% překračuje 20% threshold`)
      clearTimeout(killTimer)
      process.exit(1)
    }

    clearTimeout(killTimer)
    process.exit(0)
  } catch (err) {
    console.error('[executor] Fatální chyba:', err)
    clearTimeout(killTimer)
    process.exit(1)
  }
}

main()
