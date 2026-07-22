// Site Scanner — automatický průchod webu, detekce UX/tech problémů.
// Cron: pondělí + čtvrtek 04:00 UTC (0 4 * * 1,4)
// Spuštění: npm run cron:site-scanner
// Dry-run:  npm run cron:site-scanner -- --dry-run

import { runSiteScanner } from '@/lib/site-scanner'

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Site Scanner — ${new Date().toISOString()}`)
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (žádný zápis do DB)' : 'PRODUCTION'}`)
  console.log('═'.repeat(60))

  const result = await runSiteScanner({ dryRun: isDryRun })

  console.log('\n' + '─'.repeat(60))
  console.log('SOUHRN')
  console.log('─'.repeat(60))
  console.log(`URLs naskenováno:  ${result.urlsScanned}`)
  console.log(`URLs selhalo:      ${result.urlsFailed}`)
  console.log(`Nálezů celkem:     ${result.findingsTotal}`)
  console.log(`  🔴 high:         ${result.findingsBySeverity.high}`)
  console.log(`  🟡 medium:       ${result.findingsBySeverity.medium}`)
  console.log(`  🔵 low:          ${result.findingsBySeverity.low}`)

  if (result.findings.length > 0) {
    console.log('\nDETAIL NÁLEZŮ:')
    for (const f of result.findings) {
      const icon = f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '🔵'
      console.log(`\n${icon} [${f.findingType}] ${f.url}`)
      console.log(`   Detail:   ${f.detail}`)
      if (f.element) console.log(`   Element:  ${f.element}`)
      if (f.evidence) console.log(`   Evidence: ${f.evidence}`)
    }
  } else {
    console.log('\n✅ Žádné nálezy — web je v pořádku')
  }

  console.log('\n' + '═'.repeat(60))
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
