/**
 * Daily proposal audit — projde web, najde co je špatně, navrhne řešení.
 * NEAPLIKUJE návrhy automaticky — admin schvaluje v /admin/seo?tab=navrhy.
 *
 * Schedule: `0 3 * * *` (3:00 UTC denně, před auto-audit a scraperem)
 * Run:      npx tsx --env-file=.env.local scripts/cron/proposal-audit.ts
 */
import { runAllAuditRules, persistProposals } from '@/lib/audit-rules'
import { logActivity } from '@/lib/seo-activity'

async function main() {
  const startedAt = Date.now()
  console.log('═══ Proposal audit ═══\n')

  const results = await runAllAuditRules()
  let totalInserted = 0
  let totalUpdated = 0
  let totalDetected = 0

  for (const r of results) {
    if (r.detected === 0) {
      console.log(`  ${r.rule}: 0`)
      continue
    }
    const persist = await persistProposals(r.proposals)
    totalInserted += persist.inserted
    totalUpdated += persist.updated
    totalDetected += r.detected
    console.log(`  ${r.rule}: ${r.detected} detected (${persist.inserted} new, ${persist.updated} updated)`)
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\n═══ Done in ${elapsed}s ═══`)
  console.log(`Total: ${totalDetected} návrhů (${totalInserted} new, ${totalUpdated} updated)`)

  await logActivity({
    action_type: 'audit',
    title: 'Proposal audit (denní)',
    description: `${totalDetected} návrhů detekováno (${totalInserted} new). Schval v /admin/seo?tab=navrhy.`,
    metadata: { results: results.map(r => ({ rule: r.rule, count: r.detected })), elapsed_s: parseFloat(elapsed) },
    source: 'cron',
  })
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
