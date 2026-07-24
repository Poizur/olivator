import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// Slugy permanentně odstraněné z právních důvodů — toggle zakázán.
const REMOVED_LEGAL_SLUGS = new Set(['olivum'])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const targetStatus: 'active' | 'quarantine' = body.targetStatus === 'active' ? 'active' : 'quarantine'

    const { data: retailer, error: fetchErr } = await supabaseAdmin
      .from('retailers')
      .select('id, slug, is_active, name')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!retailer) return NextResponse.json({ error: 'Retailer nenalezen' }, { status: 404 })
    if (REMOVED_LEGAL_SLUGS.has(retailer.slug as string)) {
      return NextResponse.json({ error: 'Tento prodejce byl odstraněn z právních důvodů a nelze ho reaktivovat.' }, { status: 403 })
    }

    const newIsActive = targetStatus === 'active'
    const { error: updateErr } = await supabaseAdmin
      .from('retailers')
      .update({ is_active: newIsActive })
      .eq('id', id)
    if (updateErr) throw updateErr

    // Log do agent_decisions
    await supabaseAdmin.from('agent_decisions').insert({
      agent: 'admin-ui',
      action: 'retailer_status_toggle',
      entity_type: 'retailer',
      entity_id: id,
      decision: targetStatus,
      reasoning: `Manuální přepnutí: ${retailer.name} → ${targetStatus}`,
      metadata: { retailer_slug: retailer.slug, prev_is_active: retailer.is_active, new_is_active: newIsActive },
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true, newStatus: targetStatus })
  } catch (err) {
    console.error('[admin/retailers/toggle-status]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
