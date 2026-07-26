import { validateExecutorRule, fireExecutorForDecision } from '@/lib/executor/decision-bridge'

async function main() {
  const decisionId = 'd3fb98dc-898d-4c77-8947-5129f6fc3c3b'
  const executorRule = 'recalc_score'
  const category = 'catalog'
  
  // Validate
  const validation = validateExecutorRule(executorRule, category)
  console.log('Validation:', JSON.stringify(validation))
  
  if (!validation.valid) {
    console.log('BLOKOVÁNO:', validation.reason)
    return
  }
  
  // Fire (dry — safe, recalc_score only reads + updates, no destructive ops)
  console.log('Spouštím executor...')
  const result = await fireExecutorForDecision(decisionId, 'recalc_score')
  console.log('Result:', JSON.stringify({
    dedupSkip: result.dedupSkip,
    error: result.error,
    report: result.report,
  }, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
