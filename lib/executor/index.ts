import { supabaseAdmin } from '@/lib/supabase'
import type { ExecutorRuleOptions, OperationResult } from './types'
import fixBrokenToken from './rules/fix-broken-token'
import fixAffiliateUrl from './rules/fix-affiliate-url'
import recalcScore from './rules/recalc-score'

export const ALL_RULES = [fixBrokenToken, fixAffiliateUrl, recalcScore]

export interface ExecutorRunOptions {
  dryRun?: boolean
  ruleFilter?: string
  maxOps?: number
  triggeredBy?: string
}

export interface ExecutorReport {
  dryRun: boolean
  rulesRun: string[]
  totalOps: number
  applied: number
  skipped: number
  failed: number
  results: OperationResult[]
  failRate: number
}

export async function runExecutor(opts: ExecutorRunOptions = {}): Promise<ExecutorReport> {
  const dryRun = opts.dryRun ?? true
  const maxOps = opts.maxOps ?? 50
  const triggeredBy = opts.triggeredBy ?? 'daily_scan'

  const ruleOpts: ExecutorRuleOptions = { dryRun, maxOps, triggeredBy }

  const rules = opts.ruleFilter
    ? ALL_RULES.filter(r => r.name === opts.ruleFilter)
    : ALL_RULES

  if (!rules.length) throw new Error(`Pravidlo "${opts.ruleFilter}" neexistuje`)

  let allResults: OperationResult[] = []
  const rulesRun: string[] = []

  for (const rule of rules) {
    console.log(`\n[executor] === Pravidlo: ${rule.name} ===`)
    const ruleResults = await rule.run(ruleOpts)
    allResults = allResults.concat(ruleResults)
    rulesRun.push(rule.name)
  }

  const applied = allResults.filter(r => r.status === 'applied').length
  const skipped = allResults.filter(r => r.status === 'skipped').length
  const failed = allResults.filter(r => r.status === 'failed').length
  const failRate = allResults.length > 0 ? failed / allResults.length : 0

  // Safety brake: > 20 % selhání = eskalace
  if (failRate > 0.2 && allResults.length >= 5) {
    console.error(`[executor] ESKALACE — fail rate ${(failRate * 100).toFixed(0)}% (${failed}/${allResults.length})`)
  }

  // Loguj do executor_operations (vždy, i dry-run)
  if (!dryRun && allResults.length > 0) {
    const rows = allResults.map(r => ({
      operation_type: r.operationType,
      target_type: r.targetType,
      target_id: r.targetId ?? null,
      target_slug: r.targetSlug ?? null,
      field_changed: r.fieldChanged ?? null,
      value_before: r.valueBefore ?? null,
      value_after: r.valueAfter ?? null,
      verified_at_source: r.verifiedAtSource,
      source_url: r.sourceUrl ?? null,
      source_evidence: r.sourceEvidence ?? null,
      status: r.status,
      skip_reason: r.skipReason ?? null,
      triggered_by: triggeredBy,
      learnings_applied: r.learningsApplied ?? null,
    }))

    const { error } = await supabaseAdmin.from('executor_operations').insert(rows)
    if (error) console.error('[executor] insert do executor_operations selhal:', error.message)
  }

  return {
    dryRun,
    rulesRun,
    totalOps: allResults.length,
    applied,
    skipped,
    failed,
    results: allResults,
    failRate,
  }
}
