// Bulk status change pro produkty z /admin/products tabulky.
// User vybere checkboxy → klikne 'Vyřadit' / 'Publikovat' / 'Neaktivní'.
// Endpoint nastavi status + reason code + audit kdo/kdy.

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set(['active', 'inactive', 'excluded'])

const REASON_CODE_MAP: Record<string, string> = {
  active: '',
  inactive: 'manual_hide',
  excluded: 'not_interesting',
}

const REASON_NOTE_MAP: Record<string, string> = {
  active: '',
  inactive: 'Skryto adminem (hromadná akce)',
  excluded: 'Vyřazeno adminem jako odpad (hromadná akce)',
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.ids) || typeof body.status !== 'string') {
    return NextResponse.json(
      { error: 'Body musí obsahovat { ids: string[], status: "active"|"inactive"|"excluded" }' },
      { status: 400 }
    )
  }

  const { ids, status } = body as { ids: string[]; status: string }
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: `Neznámý status: ${status}` }, { status: 400 })
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: 'Prázdný seznam ID' }, { status: 400 })
  }
  if (ids.length > 500) {
    return NextResponse.json({ error: 'Max 500 produktů per request' }, { status: 400 })
  }

  const reasonCode = REASON_CODE_MAP[status] || null
  const reasonNote = REASON_NOTE_MAP[status] || null
  const now = new Date().toISOString()

  const patch: Record<string, unknown> = {
    status,
    status_reason_code: status === 'active' ? null : reasonCode,
    status_reason_note: status === 'active' ? null : reasonNote,
    status_changed_by: 'admin',
    status_changed_at: now,
    updated_at: now,
  }

  const { error, count } = await supabaseAdmin
    .from('products')
    .update(patch, { count: 'exact' })
    .in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    updated: count ?? 0,
    status,
  })
}
