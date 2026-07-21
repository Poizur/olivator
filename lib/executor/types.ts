export type OperationType = 'fix_broken_token' | 'fix_affiliate_url' | 'recalc_score'
export type OperationStatus = 'applied' | 'skipped' | 'failed' | 'escalated'

export interface OperationResult {
  operationType: OperationType
  targetType: string
  targetId?: string
  targetSlug?: string
  fieldChanged?: string
  valueBefore?: string
  valueAfter?: string
  verifiedAtSource: boolean
  sourceUrl?: string
  sourceEvidence?: string
  status: OperationStatus
  skipReason?: string
  learningsApplied?: string[]
}

export interface ExecutorRuleOptions {
  dryRun: boolean
  maxOps: number
  triggeredBy: string
}

export interface ExecutorRule {
  name: OperationType
  run(opts: ExecutorRuleOptions): Promise<OperationResult[]>
}
