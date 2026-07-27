import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

const VALID_STATUSES = new Set([
  'email_sent',
  'consented_free',
  'consented_affiliate',
  'declined',
  'no_response',
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status, consentRef } = body as { status?: string; consentRef?: string }

    if (status !== null && status !== undefined && !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: `Neplatný status: ${status}` }, { status: 400 })
    }

    const update: Record<string, unknown> = {
      legalization_status: status ?? null,
      legalization_status_at: status ? new Date().toISOString() : null,
    }
    if (consentRef !== undefined) update.legalization_consent_ref = consentRef || null

    const { error } = await supabaseAdmin
      .from('retailers')
      .update(update)
      .eq('id', id)
    if (error) throw error

    await supabaseAdmin.from('agent_decisions').insert({
      agent: 'admin-ui',
      action: 'legalization_status_update',
      entity_type: 'retailer',
      entity_id: id,
      decision: status ?? 'cleared',
      reasoning: `Legalizační kampaň: status nastaven na ${status ?? 'null'}`,
      metadata: { consent_ref: consentRef ?? null },
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/retailers/legalization-status]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
