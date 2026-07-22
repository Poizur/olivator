import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { validateExecutorRule, fireExecutorForDecision } from '@/lib/executor/decision-bridge'
import type { ValidExecutorRule } from '@/lib/executor/decision-bridge'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/brief/decision
// Body: { decisionId, choice: 'ANO' | 'NE' | 'ODLOŽIT', note?: string }
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { decisionId?: string; choice?: string; note?: string }
  if (!body.decisionId || !body.choice) {
    return NextResponse.json({ error: 'decisionId and choice are required' }, { status: 400 })
  }

  const { data: decision, error } = await supabaseAdmin
    .from('weekly_decisions')
    .update({
      admin_choice: body.choice,
      admin_note: body.note ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', body.decisionId)
    .select('brief_id, executor_rule, category')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Pokud jsou všechna rozhodnutí v briefu vyřešená, přepni brief na 'reviewed'
  if (decision?.brief_id) {
    const { count } = await supabaseAdmin
      .from('weekly_decisions')
      .select('*', { count: 'exact', head: true })
      .eq('brief_id', decision.brief_id as string)
      .is('admin_choice', null)

    if (count === 0) {
      await supabaseAdmin
        .from('weekly_briefs')
        .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
        .eq('id', decision.brief_id as string)
    }
  }

  // Executor bridge — spustí se jen při ANO + platné executor_rule
  if (body.choice === 'ANO' && decision?.executor_rule) {
    const validation = validateExecutorRule(
      decision.executor_rule as string,
      decision.category as string,
    )

    if (!validation.valid) {
      console.log(`[decision-route] Executor BLOKOVÁN — ${validation.reason}`)
      return NextResponse.json({ ok: true, executorTriggered: false, blockReason: validation.reason })
    }

    const execution = await fireExecutorForDecision(body.decisionId, validation.rule as ValidExecutorRule)

    if (execution.dedupSkip) {
      return NextResponse.json({ ok: true, executorTriggered: false, dedupSkip: true })
    }

    if (execution.error) {
      return NextResponse.json({
        ok: true,
        executorTriggered: true,
        executorError: execution.error,
      })
    }

    return NextResponse.json({
      ok: true,
      executorTriggered: true,
      executorReport: {
        applied: execution.report?.applied ?? 0,
        skipped: execution.report?.skipped ?? 0,
        failed: execution.report?.failed ?? 0,
        totalOps: execution.report?.totalOps ?? 0,
      },
    })
  }

  return NextResponse.json({ ok: true, executorTriggered: false })
}
