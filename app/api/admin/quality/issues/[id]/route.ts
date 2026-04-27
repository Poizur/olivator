import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { attemptAutoFix } from '@/lib/quality-rules'

export const maxDuration = 60

/** PATCH — update issue status (resolve, ignore) or trigger auto-fix. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const action: string = body?.action

    if (action === 'auto_fix') {
      const result = await attemptAutoFix(id)
      return NextResponse.json({ ok: result.ok, message: result.message })
    }

    if (action === 'ignore') {
      await supabaseAdmin
        .from('quality_issues')
        .update({
          status: 'ignored',
          resolved_at: new Date().toISOString(),
          resolved_by: 'admin',
        })
        .eq('id', id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'resolve') {
      await supabaseAdmin
        .from('quality_issues')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: 'admin',
        })
        .eq('id', id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
