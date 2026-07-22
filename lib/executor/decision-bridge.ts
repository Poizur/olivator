// Decision→Executor bridge — dvojitá validace před automatickým spuštěním.
// Voláno z /api/admin/brief/decision po volbě ANO.
//
// Podmínky pro auto-spuštění (všechny 3 musí platit):
//   a) executor_rule je v AUTO_WHITELIST (enum check)
//   b) category rozhodnutí odpovídá RULE_CATEGORY_MAP[rule]
//   c) neproběhl jiný běh pro toto rozhodnutí v posledních 60s (dedup)

import { supabaseAdmin } from '@/lib/supabase'
import { runExecutor } from '@/lib/executor'
import type { ExecutorReport } from '@/lib/executor'
import { observePattern } from '@/lib/learning-memory'
import { sendExecutionFailedNotification } from '@/lib/email'

export type ValidExecutorRule = 'fix_affiliate_url' | 'recalc_score'

const RULE_CATEGORY_MAP: Record<ValidExecutorRule, string[]> = {
  fix_affiliate_url: ['affiliate'],
  recalc_score: ['catalog', 'katalog', 'product'],
}

const AUTO_WHITELIST: ValidExecutorRule[] = ['fix_affiliate_url', 'recalc_score']

const DEDUP_WINDOW_MS = 60_000

export type ValidationResult =
  | { valid: true; rule: ValidExecutorRule }
  | { valid: false; reason: string }

export function validateExecutorRule(
  rule: string | null | undefined,
  category: string | null | undefined,
): ValidationResult {
  if (!rule) {
    return { valid: false, reason: 'executor_rule je null — rozhodnutí bez auto-akce' }
  }

  // Podmínka a: pravidlo musí být v AUTO_WHITELIST (halucinace → injection odmítnuta)
  if (!AUTO_WHITELIST.includes(rule as ValidExecutorRule)) {
    return {
      valid: false,
      reason: `"${rule}" není v AUTO_WHITELIST — halucinace nebo injection odmítnuta`,
    }
  }

  // Podmínka b: kategorie rozhodnutí musí odpovídat RULE_CATEGORY_MAP
  const allowedCategories = RULE_CATEGORY_MAP[rule as ValidExecutorRule]
  if (!category || !allowedCategories.includes(category)) {
    return {
      valid: false,
      reason: `Kategorie "${category ?? 'null'}" neodpovídá pravidlu "${rule}" — povoleno jen pro: ${allowedCategories.join(', ')}`,
    }
  }

  return { valid: true, rule: rule as ValidExecutorRule }
}

export interface ExecutionResult {
  triggered: boolean
  report?: ExecutorReport
  error?: string
  dedupSkip?: boolean
}

export async function fireExecutorForDecision(
  decisionId: string,
  rule: ValidExecutorRule,
): Promise<ExecutionResult> {
  // Podmínka c: dedup — zkontroluj executed_at
  const { data: row } = await supabaseAdmin
    .from('weekly_decisions')
    .select('executed_at')
    .eq('id', decisionId)
    .single()

  if (row?.executed_at) {
    const elapsedMs = Date.now() - new Date(row.executed_at as string).getTime()
    if (elapsedMs < DEDUP_WINDOW_MS) {
      console.log(`[decision-bridge] DEDUP skip — executed_at před ${Math.round(elapsedMs / 1000)}s`)
      return { triggered: false, dedupSkip: true }
    }
  }

  // Označ executed_at před spuštěním (optimistický zámek proti race condition)
  await supabaseAdmin
    .from('weekly_decisions')
    .update({ executed_at: new Date().toISOString() })
    .eq('id', decisionId)

  try {
    console.log(`[decision-bridge] Spouštím executor: rule=${rule}, decisionId=${decisionId}`)
    const report = await runExecutor({
      dryRun: false,
      ruleFilter: rule,
      maxOps: 20,
      triggeredBy: 'brief_decision',
    })

    console.log(`[decision-bridge] Executor hotov — applied=${report.applied}, failed=${report.failed}`)

    // observePattern: sleduj opakující se auto-spuštění (pro budoucí lekce)
    if (report.applied > 0) {
      await observePattern({
        signature: `brief_auto_exec_${rule}`,
        description: `Pravidlo ${rule} automaticky spuštěno z briefu, ${report.applied} aplikováno`,
        exampleContext: {
          rule,
          decisionId,
          applied: report.applied,
          failed: report.failed,
          date: new Date().toISOString(),
        },
      }).catch(() => {})
    }

    return { triggered: true, report }
  } catch (err) {
    const error = (err as Error).message
    console.error('[decision-bridge] Executor selhal:', error)

    // Reset executed_at aby admin mohl zkusit znovu
    try {
      await supabaseAdmin
        .from('weekly_decisions')
        .update({ executed_at: null })
        .eq('id', decisionId)
    } catch { /* non-fatal */ }

    // Log do agent_decisions pro audit trail
    try {
      await supabaseAdmin
        .from('agent_decisions')
        .insert({
          agent_name: 'executor',
          decision_type: 'executor_auto_trigger_failed',
          payload: { decisionId, rule, error },
        })
    } catch (e) {
      console.error('[decision-bridge] agent_decisions insert failed:', (e as Error).message)
    }

    // Email notifikace
    await sendExecutionFailedNotification({ decisionId, rule, error }).catch(() => {})

    return { triggered: true, error }
  }
}
