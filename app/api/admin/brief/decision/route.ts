import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/brief/decision
// Body: { decisionId, choice: 'ANO' | 'NE' | 'SPÄTER' | string, note?: string }
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { decisionId?: string; choice?: string; note?: string }
  if (!body.decisionId || !body.choice) {
    return NextResponse.json({ error: 'decisionId and choice are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('weekly_decisions')
    .update({
      admin_choice: body.choice,
      admin_note: body.note ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', body.decisionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
